import React from 'react';
import { Attributes } from '../types';

interface Props {
  attributes: Attributes;
  diffs: number[] | null; // 接收当前题目的分值变动 [c, b, i, s]
}

const AttributeBars: React.FC<Props> = ({ attributes, diffs }) => {
  const categories = [
    { key: 'cunning', label: '权谋', value: attributes.cunning, idx: 0 },
    { key: 'benevolence', label: '仁德', value: attributes.benevolence, idx: 1 },
    { key: 'innovation', label: '革新', value: attributes.innovation, idx: 2 },
    { key: 'integrity', label: '守正', value: attributes.integrity, idx: 3 },
  ];

  return (
    /* 修改点：移动端使用 flex-row 配合 gap-2 强制单行平铺，进一步压缩垂直空间 */
    <div className="flex flex-row flex-wrap md:flex-nowrap gap-2 md:gap-6 w-full">
      {categories.map((cat) => {
        const change = diffs ? diffs[cat.idx] : 0;
        return (
          /* 修改点：移动端使用 flex-1 自动平分宽度，减少外边距占用 */
          <div key={cat.key} className="flex flex-col gap-0.5 flex-1 md:w-28 relative min-w-[60px]">
            <div className="flex justify-between items-center text-[9px] md:text-xs font-bold text-stone-400">
              <span className="truncate">{cat.label}</span>
              <span className="text-yellow-600 ml-1">{cat.value}</span>
            </div>
            
            {/* 进度条：高度从 1.5 缩减为 1，减少纵向高度 */}
            <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden border border-stone-800">
              <div 
                className="h-full bg-gradient-to-r from-[#d4a373] to-[#b8860b] transition-all duration-700 ease-out" 
                style={{ width: `${Math.min(cat.value, 100)}%` }}
              ></div>
            </div>

            {/* 数值飘字动画 */}
            {change !== 0 && (
              <div 
                key={`${cat.key}-${change}`} 
                className={`absolute -top-3 right-0 font-bold text-[9px] md:text-xs animate-float-up ${
                  change > 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {change > 0 ? `+${change}` : change}
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-15px); opacity: 0; }
        }
        .animate-float-up {
          animation: float-up 1.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AttributeBars;