import startBg from './assets/bgs/bg_start.jpg';
import React, { useState, useEffect } from 'react'; // 修改：引入 useEffect
import { Attributes, EndingType, Question, Reaction, Character } from './types';
import { QUESTIONS, INITIAL_ATTRIBUTES } from './constants';
import { generateInscription } from './services/geminiService';
import AttributeBars from './components/AttributeBars';
import AttributeRadar from './components/AttributeRadar';

// 新增：背景切换动画样式字符串
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

  const [pendingState, setPendingState] = useState<{attrs: Attributes, choice: string, choices: string[]}>({
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

  const currentQuestion = QUESTIONS[currentQuestionIndex];

  // --- 动态背景逻辑 (已修改图片引用逻辑) ---
  const getBackgroundImage = () => {
    // 自动获取 vite.config.ts 中的 base 路径
    const baseUrl = import.meta.env.BASE_URL;
    
    // 辅助函数：确保路径拼接时不会出现双斜杠
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

  const handleAnswer = (optionLabel: string, scores: [number, number, number, number], reaction?: Reaction) => {
    const newAttributes = {
      cunning: attributes.cunning + scores[0],
      benevolence: attributes.benevolence + scores[1],
      innovation: attributes.innovation + scores[2],
      integrity: attributes.integrity + scores[3],
    };
    const newChoices = [...choices, optionLabel];
    
    setCurrentDiffs([...scores]);
    setAttributes(newAttributes); 
    setPendingState({ attrs: newAttributes, choice: optionLabel, choices: newChoices });

    if (reaction) {
      setActiveReaction(reaction);
      setIsReactionVisible(true);
    } else {
      setTimeout(() => proceedToNext(newAttributes, optionLabel, newChoices), 800);
    }
  };

  const handleContinue = () => {
    setIsReactionVisible(false);
    setCurrentDiffs(null); 
    proceedToNext(pendingState.attrs, pendingState.choice, pendingState.choices);
  };

  const calculateEnding = (attrs: Attributes, lastChoice: string): EndingType => {
    const { cunning: c, benevolence: b, innovation: i, integrity: s } = attrs;
    if (c >= 80 && s <= 30) return EndingType.IRON_EMPRESS;
    if (s >= 70 && b >= 60) return EndingType.SAINT_MONARCH;
    if (b <= 30 && c <= 40) return EndingType.LONELY_DEATH;
    if (i >= 80) return EndingType.INNOVATOR;
    if (lastChoice === 'C' && currentQuestionIndex === 9) return EndingType.BLANK_SLATE;
    return EndingType.SAINT_MONARCH;
  };

  const proceedToNext = async (finalAttrs: Attributes, lastChoice: string, finalChoices: string[]) => {
    setChoices(finalChoices);
    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setGameState('calculating');
      const finalEnding = calculateEnding(finalAttrs, lastChoice);
      setEnding(finalEnding);
      try {
        const res = await generateInscription(finalAttrs, finalEnding, finalChoices);
        setInscription(res);
        setGameState('result');
      } catch (error) {
        setInscription("大唐风云起，无字留后人。");
        setGameState('result');
      }
    }
  };

  const resetGame = () => {
    setAttributes(INITIAL_ATTRIBUTES);
    setChoices([]);
    setCurrentQuestionIndex(0);
    setGameState('start');
    setInscription("");
  };

  const renderCharacterList = (characters: Character[]) => (
    <div className="flex flex-row gap-3 mb-6 w-full overflow-hidden">
      {characters.map((char, index) => (
        <div 
          key={`char-${index}`} 
          className="flex-1 bg-stone-800/60 border border-[#d4a373]/30 rounded-lg p-3 flex flex-col justify-between animate-fade-in backdrop-blur-md min-w-0"
        >
          <div className="mb-2">
            <h4 className="text-[#d4a373] font-bold text-sm truncate">
              {char.name} 
              <span className="ml-1 text-[10px] font-normal opacity-50">[{char.title}]</span>
            </h4>
            <p className="text-stone-400 text-[11px] leading-tight mt-1 line-clamp-2">
              {char.bio}
            </p>
          </div>
          <button 
            onClick={(e) => handleWikiClick(e, char.wikiUrl)}
            className="w-full text-[9px] bg-[#d4a373]/10 border border-[#d4a373]/40 text-[#d4a373] py-1 rounded hover:bg-[#d4a373] hover:text-black transition-all font-bold uppercase tracking-tighter"
          >
            百科
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* 注入 CSS 动画样式 */}
      <style>{bgTransitionStyle}</style>

      <div 
        // 修改点：添加 key 强制重新挂载以触发 bg-transition 动画
        key={getBackgroundImage()} 
        className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden text-stone-200 bg-cover bg-center bg-transition"
        style={{ backgroundImage: `url(${getBackgroundImage()})` }}
      >
        {/* 核心遮罩层：增加背景暗度并提供全局毛玻璃感 */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-0"></div>
        
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] z-10"></div>

        {gameState === 'start' && (
          <div className="max-w-2xl w-full text-center space-y-12 animate-fade-in bg-stone-900/60 backdrop-blur-xl p-12 border border-[#d4a373]/30 rounded-lg shadow-2xl relative z-20">
            <h1 className="text-6xl md:text-8xl font-weibei text-[#d4a373] drop-shadow-[0_0_15px_rgba(212,163,115,0.5)]">无字碑</h1>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#d4a373]/50 to-transparent"></div>
            <div className="space-y-6">
              <p className="text-2xl italic text-stone-400 font-weibei">“己之功过，留待后人评说”</p>
              <p className="text-lg leading-relaxed text-stone-300 px-6 font-serif font-bold text-center">
                化身武则天，历经从入宫才人到一代女皇的十次生死抉择，在抉择中重塑命格。是做回大唐皇后，还是成就唯一女帝？
              <br />
                这块无字碑的碑文，由你亲自书写。
              </p>
            </div>
            <button onClick={() => setGameState('playing')} className="px-16 py-4 border-2 border-[#d4a373] text-[#d4a373] text-2xl tracking-[0.5em] font-bold font-weibei hover:bg-[#d4a373] hover:text-stone-900 transition-all">
              启 阅
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="max-w-4xl w-full space-y-8 animate-fade-in-up bg-[#2d241e]/85 backdrop-blur-2xl p-6 md:p-10 border border-[#d4a373]/30 rounded-lg shadow-2xl relative min-h-[600px] z-20">
            
            <div className="relative z-50 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#d4a373]/20 pb-6 gap-4">
              <span className="text-[#d4a373] font-bold tracking-widest text-lg font-weibei">第 {currentQuestionIndex + 1} / 10 抉择</span>
              <AttributeBars attributes={attributes} diffs={currentDiffs} />
            </div>

            {/* 修改点：将 duration-200 修改为 duration-75 极速切换 */}
            <div className={`relative z-20 transition-all duration-75 ${isReactionVisible ? 'opacity-20 blur-sm scale-[0.98]' : ''}`}>
              {currentQuestion.newCharacters && currentQuestion.newCharacters.length > 0 && 
                renderCharacterList(currentQuestion.newCharacters)
              }
              
              <h2 className="text-2xl md:text-3xl leading-snug text-stone-100 font-bold font-serif mb-10 min-h-[100px]">
                {currentQuestion.text}
              </h2>

              <div className="grid grid-cols-1 gap-5">
                {currentQuestion.options.map((opt) => (
                  <button
                    key={opt.label}
                    disabled={isReactionVisible}
                    onClick={() => handleAnswer(opt.label, opt.scores, opt.reaction)}
                    className="group text-left p-6 bg-black/40 border border-stone-700/50 hover:border-[#d4a373] transition-all rounded-sm backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-6">
                      <span className="text-[#d4a373] font-bold text-3xl font-serif opacity-60">{opt.label}</span>
                      <p className="text-stone-300 text-xl font-serif">{opt.text}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {isReactionVisible && activeReaction && (
              <div className="absolute inset-0 top-24 z-40 flex items-center justify-center bg-[#1a140f]/95 rounded-b-lg animate-fade-in backdrop-blur-md">
                <div className="text-center px-10 space-y-6 max-w-2xl w-full">
                  <p className="text-[#d4a373] text-xs tracking-[0.6em]">— {activeReaction.speaker} 回应 —</p>
                  <p className="text-3xl md:text-4xl text-stone-100 font-weibei italic leading-tight">"{activeReaction.text}"</p>
                  
                  <div className="flex justify-around items-center py-2 px-4 bg-stone-900/60 border border-[#d4a373]/20 rounded-t-md">
                    {['权谋', '仁德', '革新', '守正'].map((label, i) => {
                      const val = currentDiffs ? currentDiffs[i] : 0;
                      return (
                        <div key={label} className="flex flex-col items-center">
                          <span className="text-[10px] text-stone-500 mb-0.5">{label}</span>
                          <span className={`text-sm font-bold ${val > 0 ? 'text-green-500' : val < 0 ? 'text-red-500' : 'text-stone-400'}`}>
                            {val > 0 ? `+${val}` : val}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-stone-900/90 p-6 rounded-b border-l-4 border-[#d4a373] text-left mt-0">
                    <p className="text-[#d4a373] font-bold text-xs mb-2">📜 史实对照</p>
                    <p className="text-stone-400 text-sm italic font-serif leading-relaxed">
                      {currentQuestion.historicalFact}
                    </p>
                  </div>

                  <button onClick={handleContinue} className="w-full py-4 bg-[#d4a373] text-stone-900 font-bold tracking-[0.4em] text-xl font-weibei hover:bg-[#e6b17a] transition-all shadow-lg active:scale-95">
                    执 笔 续 史
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {gameState === 'calculating' && (
          <div className="flex flex-col items-center space-y-8 animate-pulse z-20">
            <div className="w-16 h-16 border-4 border-[#d4a373] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-2xl font-weibei text-[#d4a373]">史官研墨，铭刻碑文...</p>
          </div>
        )}

        {gameState === 'result' && (
          <div className="max-w-5xl w-full space-y-8 animate-fade-in p-4 py-8 z-20">
            <div className="text-center space-y-4">
              <p className="text-[#d4a373] tracking-[1em] font-bold uppercase text-sm">天 命 终 结</p>
              <h2 className="text-5xl md:text-7xl font-weibei text-yellow-500 gold-glow">{ending}</h2>
            </div>
            <div className="flex flex-col xl:flex-row gap-8 items-stretch">
              <div className="xl:w-3/5 w-full order-2 xl:order-1">
                <div className="tombstone-texture p-10 md:p-16 border-y-8 border-[#d4a373]/20 min-h-[600px] flex justify-center items-center bg-stone-900/60 backdrop-blur-lg shadow-inner">
                  <div className="writing-vertical-rl text-[#fefae0] text-2xl md:text-4xl leading-[1.6] font-weibei opacity-90">
                    <p className="whitespace-pre-wrap">{inscription}</p>
                  </div>
                </div>
              </div>
              
              <div className="xl:w-2/5 w-full order-1 xl:order-2 flex flex-col gap-6">
                <div className="bg-[#1a140f]/80 backdrop-blur-xl p-8 border-2 border-[#d4a373]/30 rounded-lg shadow-xl flex flex-col flex-grow">
                  <h3 className="text-[#d4a373] text-xl font-bold border-b border-[#d4a373]/20 pb-4 mb-4 tracking-widest uppercase text-center font-weibei">皇 权 衡 柱</h3>
                  
                  <div className="flex-grow flex items-center justify-center py-2">
                    <AttributeRadar attributes={attributes} />
                  </div>

                  <div className="mt-4 p-6 bg-stone-900/80 border-l-2 border-[#d4a373] rounded-r-sm animate-fade-in">
                    <p className="text-[#d4a373] text-[10px] tracking-[0.2em] font-bold mb-3 uppercase font-serif">✦ 史 官 简 评</p>
                    <p className="text-stone-200 text-lg font-weibei italic leading-relaxed">
                      “{getEvaluation()}”
                    </p>
                    <p className="text-stone-500 text-[9px] mt-4 text-right tracking-widest italic font-serif">
                      — 乾坤已定 · 命数归一 —
                    </p>
                  </div>
                </div>
                
                <button onClick={resetGame} className="w-full py-6 bg-black/40 backdrop-blur-md border-2 border-[#d4a373] text-[#d4a373] hover:bg-[#d4a373] hover:text-stone-900 transition-all text-xl font-bold font-weibei tracking-[0.4em] shadow-lg">
                  再 启 尘 封 之 史
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default App;