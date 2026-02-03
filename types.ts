/**
 * 核心属性维度
 */
export interface Attributes {
  cunning: number;     // 权谋
  benevolence: number; // 仁德
  innovation: number;  // 革新
  integrity: number;   // 守正
}

/**
 * 历史人物定义
 */
export interface Character {
  name: string;      // 人物姓名
  title: string;     // 称号/身份
  bio: string;       // 简短介绍
  wikiUrl: string;   // 百科跳转链接
}

/**
 * 选项后的即时对话反馈
 */
export interface Reaction {
  speaker: string;   // 说话人姓名
  text: string;      // 对话内容
}

/**
 * 题目选项定义
 */
export interface Option {
  label: string;     // A, B, C
  text: string;      // 选项描述
  scores: [number, number, number, number]; // [权谋, 仁德, 革新, 守正]
  reaction?: Reaction; 
  nextId?: number;    // 新增：手动指定下一题的 ID，实现网状跳转
  requirement?: Partial<Attributes>; // 新增：进入该选项或通过该选项所需的数值门槛
  failEnding?: EndingType; // 新增：若未达到数值门槛，直接触发的结局类型
}

/**
 * 题目主定义
 */
export interface Question {
  id: number;
  text: string;
  background: string;     // 新增：背景图片路径
  historicalFact: string; 
  options: Option[];      
  newCharacters?: Character[]; // 修改点：支持多个人物登场
}

/**
 * 结局类型定义
 */
export enum EndingType {
  IRON_EMPRESS = "铁血女帝",
  SAINT_MONARCH = "圣君归唐",
  LONELY_DEATH = "孤帝崩殂",
  INNOVATOR = "革新先驱",
  BLANK_SLATE = "无字留白",
  DEFAULT = "历史的过客",
  FAILED_USURP = "政变失败", // 新增：数值未达标触发的失败结局
  COLD_PALACE = "冷宫弃妃"   // 新增：数值未达标触发的失败结局
}