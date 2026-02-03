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
    /* 修改点：高度在移动端从 64 稍微下调到 60 (240px)，防止结算页过长需要频繁滚动 */
    <div className="w-full h-60 md:h-80 animate-fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart 
          cx="50%" 
          cy="50%" 
          /* 修改点：移动端将半径缩减到 65%，为外圈文字留出更多 padding 空间，防止文字溢出屏幕 */
          outerRadius="65%" 
          data={data}
          /* 修改点：调整 margin 策略，确保文字不会贴边 */
          margin={{ top: 20, right: 40, bottom: 20, left: 40 }}
        >
          <PolarGrid stroke="#d4a373" strokeOpacity={0.2} strokeDasharray="3 3" />
          
          <PolarAngleAxis 
            dataKey="subject" 
            /* 修改点：移动端字号从 14 降至 12，增加文字与图表的间距 (tickSize) */
            tick={{ fill: '#d4a373', fontSize: 12, fontWeight: 'bold' }} 
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
        <p className="text-[10px] text-stone-500 font-serif tracking-widest italic">
          — 乾坤已定，命数归一 —
        </p>
      </div>
    </div>
  );
};

export default AttributeRadar;