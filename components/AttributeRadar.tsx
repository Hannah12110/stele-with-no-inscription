import React from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';
import { Attributes } from '../types';

interface Props {
  attributes: Attributes;
}

const AttributeRadar: React.FC<Props> = ({ attributes }) => {
  const data = [
    { subject: '权谋', A: attributes.cunning },
    { subject: '仁德', A: attributes.benevolence },
    { subject: '革新', A: attributes.innovation },
    { subject: '守正', A: attributes.integrity },
  ];

  return (
    /* 修改点：显著提升 PC 端 (xl) 的高度到 450px，确保雷达图有足够的伸展空间 */
    <div className="w-full h-60 md:h-80 xl:h-[450px] animate-fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart 
          cx="50%" 
          cy="50%" 
          /* 修改点：利用断点调整半径。移动端 65% 保证文字不溢出，电脑端 (xl) 提升至 80% 撑满容器 */
          outerRadius={window.innerWidth > 1280 ? "80%" : "65%"} 
          data={data}
          margin={{ top: 20, right: 40, bottom: 20, left: 40 }}
        >
          <PolarGrid stroke="#d4a373" strokeOpacity={0.2} strokeDasharray="3 3" />
          
          <PolarAngleAxis 
            dataKey="subject" 
            /* 修改点：电脑端字号增大到 16px，更显庄重 */
            tick={{ fill: '#d4a373', fontSize: window.innerWidth > 1280 ? 16 : 12, fontWeight: 'bold' }} 
            tickSize={15}
          />
          
          <PolarRadiusAxis 
            angle={45} 
            domain={[0, 150]} 
            tick={false} 
            axisLine={false} 
          />
          
          <Radar
            name="命格属性"
            dataKey="A"
            stroke="#d4a373"
            strokeWidth={2}
            fill="#d4a373"
            fillOpacity={0.5}
            isAnimationActive={true}
            animationDuration={1500}
            animationBegin={300}
          />
        </RadarChart>
      </ResponsiveContainer>
      
      <div className="text-center">
        <p className="text-[10px] md:text-xs text-stone-500 font-serif tracking-widest italic">
          — 乾坤已定，命数归一 —
        </p>
      </div>
    </div>
  );
};

export default AttributeRadar;