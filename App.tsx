import startBg from './assets/bgs/bg_start.jpg';
import React, { useState, useEffect } from 'react'; // 修改：引入 useEffect
import { Attributes, EndingType, Question, Reaction, Character, Option } from './types'; // 引入 Option 类型
import { QUESTIONS, INITIAL_ATTRIBUTES } from './constants';
import { generateInscription } from './services/geminiService';
import AttributeBars from './components/AttributeBars';
import AttributeRadar from './components/AttributeRadar';

// 新增：背景切换动画样式字符串及移动端适配样式
const bgTransitionStyle = `
  @keyframes fadeInBg {
    from { 
      opacity: 0.7; 
      filter: blur(10px) brightness(0.7); 
    }
    to { 
      opacity: 1; 
      filter: blur(0px) brightness(1); 
    }
  }
  .bg-transition {
    animation: fadeInBg 0.8s ease-out forwards;
  }
  /* 解决移动端 100vh 包含工具栏的问题 */
  .safe-h-screen {
    height: 100vh;
    height: 100dvh;
  }
`;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'calculating' | 'result'>('start');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [attributes, setAttributes] = useState<Attributes>(INITIAL_ATTRIBUTES);
  const [choices, setChoices] = useState<string[]>([]);
  const [inscription, setInscription] = useState<string>("");
  const [ending, setEnding] = useState<EndingType>(EndingType.DEFAULT);
  
  const [activeReaction, setActiveReaction] = useState<Reaction | null>(null);
  const [isReactionVisible, setIsReactionVisible] = useState(false);
  const [currentDiffs, setCurrentDiffs] = useState<number[] | null>(null);

  // 扩展 pendingState 以支持跳转和失败结局
  const [pendingState, setPendingState] = useState<{attrs: Attributes, choice: string, choices: string[], nextId?: number, failEnding?: EndingType}>({
    attrs: INITIAL_ATTRIBUTES, choice: '', choices: []
  });

  // --- 新增：所有图片预加载逻辑 ---
  useEffect(() => {
    const baseUrl = import.meta.env.BASE_URL;
    const imagesToPreload = [
      "assets/bgs/bg_start.jpg",
      "assets/bgs/bg_result.jpg",
      ...QUESTIONS.map(q => q.background)
    ];

    imagesToPreload.forEach(path => {
      const img = new Image();
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      img.src = `${baseUrl}${cleanPath}`;
    });
  }, []);

  // 修改：题目查找逻辑适配网状结构
  const currentQuestion = QUESTIONS[currentQuestionIndex];

  // --- 动态背景逻辑 (已修改图片引用逻辑) ---
  const getBackgroundImage = () => {
    const baseUrl = import.meta.env.BASE_URL;
    const formatPath = (path: string) => {
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      return `${baseUrl}${cleanPath}`;
    };

    if (gameState === 'start') return formatPath("assets/bgs/bg_start.jpg");
    if (gameState === 'playing' || gameState === 'calculating') {
      return formatPath(currentQuestion.background);
    }
    if (gameState === 'result') return formatPath("assets/bgs/bg_result.jpg");
    return formatPath("assets/bgs/bg_start.jpg");
  };

  // --- 史官评价逻辑 ---
  const getEvaluation = () => {
    const { cunning: c, benevolence: b, innovation: i, integrity: s } = attributes;
    const maxVal = Math.max(c, b, i, s);
    if (maxVal < 40) return "功过参半，治道中庸。历史长河滚滚，评价留待后人。";
    if (maxVal === c) return "君之权谋，深不可测，虽成霸业，然骨肉惊心。";
    if (maxVal === b) return "心怀天下之仁，惠及黎民，虽有优柔，终为圣主。";
    if (maxVal === i) return "变法更始，不拘一格，开前人未竟之局，功在千秋。";
    if (maxVal === s) return "刚正不阿，守正持重，社稷赖君以安，乃国之柱石。";
    return "乾坤已定，命数归一。";
  };

  const handleWikiClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // 修改：处理数值门槛判定逻辑
  const handleAnswer = (option: Option) => {
    const { label, scores, reaction, requirement, failEnding, nextId } = option;
    
    // 1. 检查属性门槛
    let isFailed = false;
    if (requirement) {
      const keys = Object.keys(requirement) as (keyof Attributes)[];
      isFailed = keys.some(key => attributes[key] < (requirement[key] || 0));
    }

    // 2. 门槛未通过，直接截断流程进入特定失败结局
    if (isFailed && failEnding) {
      setEnding(failEnding);
      setGameState('calculating');
      triggerFinalResult(attributes, label, [...choices, label], failEnding);
      return;
    }

    // 3. 门槛通过，正常累加数值并准备下一步
    const newAttributes = {
      cunning: attributes.cunning + scores[0],
      benevolence: attributes.benevolence + scores[1],
      innovation: attributes.innovation + scores[2],
      integrity: attributes.integrity + scores[3],
    };
    const newChoices = [...choices, label];
    
    setCurrentDiffs([...scores]);
    setAttributes(newAttributes); 
    setPendingState({ 
      attrs: newAttributes, 
      choice: label, 
      choices: newChoices, 
      nextId: nextId, 
      failEnding: failEnding 
    });

    if (reaction) {
      setActiveReaction(reaction);
      setIsReactionVisible(true);
    } else {
      setTimeout(() => proceedToNext(newAttributes, label, newChoices, nextId), 800);
    }
  };

  const handleContinue = () => {
    setIsReactionVisible(false);
    setCurrentDiffs(null); 
    proceedToNext(pendingState.attrs, pendingState.choice, pendingState.choices, pendingState.nextId);
  };

  const calculateEnding = (attrs: Attributes, lastChoice: string): EndingType => {
    const { cunning: c, benevolence: b, innovation: i, integrity: s } = attrs;
    // 优先返回因门槛失败而设定的结局
    if (pendingState.failEnding) return pendingState.failEnding;

    // 修改：识别当前题目 ID，确保网状跳转下结局判定准确
    const isFinalQuestion = QUESTIONS[currentQuestionIndex]?.id === 10;

    if (lastChoice === 'C' && isFinalQuestion) return EndingType.BLANK_SLATE; 
    if (c >= 80 && s <= 30) return EndingType.IRON_EMPRESS;
    if (s >= 70 && b >= 60) return EndingType.SAINT_MONARCH;
    if (b <= 30 && c <= 40) return EndingType.LONELY_DEATH;
    if (i >= 80) return EndingType.INNOVATOR;
    
    return EndingType.SAINT_MONARCH;
  };

  // 修改：处理网状跳转逻辑
  const proceedToNext = async (finalAttrs: Attributes, lastChoice: string, finalChoices: string[], nextId?: number) => {
    setChoices(finalChoices);

    // 寻找下一题的索引
    let nextIndex = -1;
    if (nextId) {
      // 如果有指定的 nextId，寻找对应的题目索引
      nextIndex = QUESTIONS.findIndex(q => q.id === nextId);
    } else {
      // 否则默认进入下一题
      nextIndex = currentQuestionIndex + 1;
    }

    // 如果还有后续题目且索引有效
    if (nextIndex > 0 && nextIndex < QUESTIONS.length) {
      setCurrentQuestionIndex(nextIndex);
    } else {
      // 否则进入结算流程
      setGameState('calculating');
      const finalEnding = calculateEnding(finalAttrs, lastChoice);
      triggerFinalResult(finalAttrs, lastChoice, finalChoices, finalEnding);
    }
  };

  // 提取结算逻辑，复用给门槛失败和正常通关
  const triggerFinalResult = async (finalAttrs: Attributes, lastChoice: string, finalChoices: string[], finalEnding: EndingType) => {
    setEnding(finalEnding);
    // 如果是无字结局，跳过碑文生成
    if (finalEnding === EndingType.BLANK_SLATE) {
      setInscription("");
      setGameState('result');
      return;
    }
    try {
      const res = await generateInscription(finalAttrs, finalEnding, finalChoices);
      setInscription(res);
      setGameState('result');
    } catch (error) {
      setInscription("大唐风云起，无字留后人。");
      setGameState('result');
    }
  };

  const resetGame = () => {
    setAttributes(INITIAL_ATTRIBUTES);
    setChoices([]);
    setCurrentQuestionIndex(0);
    setGameState('start');
    setInscription("");
    setPendingState({ attrs: INITIAL_ATTRIBUTES, choice: '', choices: [] });
  };

const renderCharacterList = (characters: Character[]) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 w-full">
    {characters.map((char, index) => (
      <div 
        key={`char-${index}`} 
        className="relative p-3 md:p-4 bg-[#2d241e]/80 border border-[#d4a373]/20 rounded backdrop-blur-md animate-fade-in"
      >
        <button 
          onClick={(e) => handleWikiClick(e, char.wikiUrl)}
          className="absolute top-2 right-2 px-2 py-0.5 border border-[#d4a373]/40 text-[#d4a373] text-[10px] hover:bg-[#d4a373]/20 transition-colors"
        >
          百科
        </button>
        <div className="flex items-center gap-2 mb-2 pr-10">
          <span className="text-[#d4a373] font-bold text-sm md:text-base">{char.name}</span>
          <span className="text-stone-500 text-[10px] md:text-xs">[{char.title}]</span>
        </div>
        <p className="text-stone-400 text-[11px] md:text-xs leading-relaxed italic">
          {char.bio}
        </p>
      </div>
    ))}
  </div>
);

  return (
    <>
      <style>{bgTransitionStyle}</style>

      <div className="safe-h-screen w-full relative overflow-hidden text-stone-200">
        <div 
          key={getBackgroundImage()} 
          className="absolute inset-0 bg-cover bg-no-repeat bg-transition z-0 bg-[50%_15%] md:bg-center"
          style={{ backgroundImage: `url(${getBackgroundImage()})` }}
        />
        
        <div className="absolute inset-0 bg-black/30 md:bg-black/40 backdrop-blur-[0.5px] md:backdrop-blur-[1px] z-10"></div>
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] z-10"></div>

        <div className="relative z-20 h-full w-full overflow-y-auto overflow-x-hidden flex flex-col items-center justify-end md:justify-center">
          
          {gameState === 'start' && (
            <div className="my-8 md:my-auto max-w-2xl w-[92%] text-center space-y-8 md:space-y-12 animate-fade-in bg-stone-900/80 backdrop-blur-xl p-6 md:p-12 border border-[#d4a373]/30 rounded-lg shadow-2xl">
              <h1 className="text-5xl md:text-8xl font-weibei text-[#d4a373] drop-shadow-[0_0_15px_rgba(212,163,115,0.5)]">无字碑</h1>
              <div className="h-px w-full bg-gradient-to-r from-transparent via-[#d4a373]/50 to-transparent"></div>
              <div className="space-y-4 md:space-y-6">
                <p className="text-lg md:text-2xl italic text-stone-400 font-weibei">“己之功过，留待后人评说”</p>
                <p className="text-sm md:text-lg leading-relaxed text-stone-300 font-serif font-bold text-center px-2">
                  化身武则天，历经从入宫才人到一代女皇的十次生死抉择，<br />在抉择中重塑命格。<br className="hidden md:block" />
                  这块无字碑的碑文，由你亲自书写。
                </p>
              </div>
              <button onClick={() => setGameState('playing')} className="px-10 py-3 md:px-12 md:py-4 border-2 border-[#d4a373] text-[#d4a373] text-lg md:text-2xl tracking-[0.5em] font-bold font-weibei hover:bg-[#d4a373] hover:text-stone-900 transition-all">
                启 阅
              </button>
            </div>
          )}

          {gameState === 'playing' && (
            <div className="w-full max-w-4xl flex flex-col p-3 md:p-10 mb-4 md:mb-0">
              <div className="bg-[#1a140f]/90 md:bg-[#2d241e]/90 backdrop-blur-2xl p-4 md:p-10 border border-[#d4a373]/30 rounded-2xl md:rounded-lg shadow-2xl flex flex-col relative overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#d4a373]/20 pb-4 md:pb-6 gap-3 md:gap-4 mb-4 md:mb-6">
                  <span className="text-[#d4a373] font-bold tracking-widest text-base md:text-lg font-weibei">第 {currentQuestion.id} / 10 抉择</span>
                  <div className="w-full md:w-2/3">
                    <AttributeBars attributes={attributes} diffs={currentDiffs} />
                  </div>
                </div>

                <div className={`flex-grow transition-all duration-75 ${isReactionVisible ? 'opacity-20 blur-sm scale-[0.98]' : ''}`}>
                  {currentQuestion.newCharacters && currentQuestion.newCharacters.length > 0 && 
                    renderCharacterList(currentQuestion.newCharacters)
                  }
                  
                  <h2 className="text-lg md:text-3xl leading-snug text-stone-100 font-bold font-serif mb-6 md:mb-8">
                    {currentQuestion.text}
                  </h2>

                  <div className="grid grid-cols-1 gap-3 md:gap-4 mb-2">
                    {currentQuestion.options.map((opt) => (
                      <button
                        key={opt.label}
                        disabled={isReactionVisible}
                        onClick={() => handleAnswer(opt)}
                        className="group text-left p-4 md:p-6 bg-black/40 border border-stone-700/50 hover:border-[#d4a373] transition-all rounded-xl md:rounded-sm backdrop-blur-sm"
                      >
                        <div className="flex items-center gap-4 md:gap-6">
                          <span className="text-[#d4a373] font-bold text-xl md:text-3xl font-serif opacity-60">{opt.label}</span>
                          <p className="text-stone-300 text-sm md:text-xl font-serif">{opt.text}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {isReactionVisible && activeReaction && (
                  <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#1a140f]/fb animate-fade-in backdrop-blur-md p-4 md:p-6">
                    <div className="text-center space-y-4 md:space-y-6 max-w-2xl w-full">
                      <p className="text-[#d4a373] text-[10px] md:text-xs tracking-[0.4em] md:tracking-[0.6em]">— {activeReaction.speaker} 回应 —</p>
                      <p className="text-xl md:text-4xl text-stone-100 font-weibei italic leading-tight">"{activeReaction.text}"</p>
                      
                      <div className="flex justify-around items-center py-2 px-4 bg-stone-900/60 border border-[#d4a373]/20 rounded-t-md">
                        {['权谋', '仁德', '革新', '守正'].map((label, i) => {
                          const val = currentDiffs ? currentDiffs[i] : 0;
                          return (
                            <div key={label} className="flex flex-col items-center">
                              <span className="text-[9px] text-stone-500 mb-0.5">{label}</span>
                              <span className={`text-xs md:text-sm font-bold ${val > 0 ? 'text-green-500' : val < 0 ? 'text-red-500' : 'text-stone-400'}`}>
                                {val > 0 ? `+${val}` : val}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="bg-stone-900/90 p-3 md:p-6 rounded-b border-l-4 border-[#d4a373] text-left">
                        <p className="text-[#d4a373] font-bold text-[10px] md:text-xs mb-1 md:mb-2">📜 史实对照</p>
                        <p className="text-stone-400 text-[11px] md:text-sm italic font-serif leading-relaxed line-clamp-3 md:line-clamp-none">
                          {currentQuestion.historicalFact}
                        </p>
                      </div>

                      <button onClick={handleContinue} className="w-full py-3 md:py-4 bg-[#d4a373] text-stone-900 font-bold tracking-[0.2em] md:tracking-[0.4em] text-base md:text-xl font-weibei hover:bg-[#e6b17a] transition-all shadow-lg active:scale-95">
                        执 笔 续 史
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {gameState === 'calculating' && (
            <div className="my-auto flex flex-col items-center space-y-6 md:space-y-8 animate-pulse p-6">
              <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-[#d4a373] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xl md:text-2xl font-weibei text-[#d4a373]">史官研墨，铭刻碑文...</p>
            </div>
          )}

          {gameState === 'result' && (
            <div className="w-full max-w-5xl space-y-6 md:space-y-8 animate-fade-in p-3 md:p-4 py-6 md:py-8">
              <div className="text-center space-y-2 md:space-y-4">
                <p className="text-[#d4a373] tracking-[0.6em] md:tracking-[1em] font-bold uppercase text-[10px] md:text-sm">天 命 终 结</p>
                <h2 className="text-3xl md:text-7xl font-weibei text-yellow-500 gold-glow">{ending}</h2>
              </div>
              <div className="flex flex-col xl:flex-row gap-6 md:gap-8 items-stretch">
                <div className="xl:w-3/5 w-full order-2 xl:order-1">
                  <div className="tombstone-texture p-6 md:p-16 border-y-8 border-[#d4a373]/20 min-h-[400px] md:min-h-[600px] flex justify-center items-center bg-stone-900/70 backdrop-blur-lg shadow-inner">
                    {/* 修改点：如果结局是无字结局，不显示碑文内容 */}
                    {ending !== EndingType.BLANK_SLATE && (
                      <div className="writing-vertical-rl text-[#fefae0] text-lg md:text-4xl leading-[1.4] md:leading-[1.6] font-weibei opacity-90 max-h-[80vh] overflow-x-auto">
                        <p className="whitespace-pre-wrap">{inscription}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="xl:w-2/5 w-full order-1 xl:order-2 flex flex-col gap-4 md:gap-6">
                  <div className="bg-[#1a140f]/80 backdrop-blur-xl p-4 md:p-8 border-2 border-[#d4a373]/30 rounded-lg shadow-xl flex flex-col">
                    <h3 className="text-[#d4a373] text-base md:text-xl font-bold border-b border-[#d4a373]/20 pb-3 md:pb-4 mb-4 tracking-widest uppercase text-center font-weibei">皇 权 衡 柱</h3>
                    
                    <div className="flex justify-center py-1 md:py-2 scale-90 md:scale-100">
                      <AttributeRadar attributes={attributes} />
                    </div>

                    <div className="mt-2 md:mt-4 p-4 md:p-6 bg-stone-900/80 border-l-2 border-[#d4a373] rounded-r-sm">
                      <p className="text-[#d4a373] text-[9px] tracking-[0.1em] font-bold mb-2 md:mb-3 uppercase font-serif">✦ 史 官 简 评</p>
                      <p className="text-stone-200 text-sm md:text-lg font-weibei italic leading-relaxed">
                        “{getEvaluation()}”
                      </p>
                    </div>
                  </div>
                  
                  <button onClick={resetGame} className="w-full py-4 md:py-6 bg-black/40 backdrop-blur-md border-2 border-[#d4a373] text-[#d4a373] hover:bg-[#d4a373] hover:text-stone-900 transition-all text-base md:text-xl font-bold font-weibei tracking-[0.3em] md:tracking-[0.4em] shadow-lg">
                    再 启 尘 封 之 史
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default App;