export const generateInscription = async function(attributes, ending, choices) {
  switch (ending) {
    case '铁血女帝':
    case 'IRON_EMPRESS':
      return `乾坤肇启  周命维新\n极权谋于宸极  运雷霆于指掌\n肃清旧党  威慑宗祏\n是以严刑定鼎  铁腕平章\n杀伐果决  万姓震服\n此中功过  既没于荒烟\n亦付于冷石  万古无声`;

    case '圣君归唐':
    case 'SAINT_MONARCH':
      return `顺天应人  复归大唐\n辅弼先皇  临朝称制\n布德施仁  薄敛省刑\n晚岁思宗庙之重  还神器于李氏\n守正不移  安社稷于磐石\n去帝号  从后礼\n一生波澜  尽归乾陵清风`;

    case '革新先驱':
    case 'INNOVATOR':
      if (choices.includes('C') || choices.includes('立上官婉儿为继承人')) {
        return `大周武曌  受命于天\n变法更始  不泥古常\n传位婉儿  开巾帼之先\n打破阴阳之拘  旷古未闻\n其志宏远  非笔墨所能状\n其道孤绝  非宗法所能容\n留白于斯  以待后哲`;
      }
      return `开殿试  创武举  拔擢寒门\n兴农桑  改官制  化育天下\n变革之志  焕乎有周\n功不在石  而在民心\n德不在言  而在治世\n千秋之下  凡才学有用武之地者\n皆感其遗泽`;

    case '无字留白':
    case 'BLANK_SLATE':
      return `迹起感业  终登宝位\n曾为神圣  亦为妖孽\n毁誉随风雷之动  是非如阴阳之割\n其才也博  其政也驳\n临终遗命  立石无言\n盖谓万事皆空  毁誉任人\n留白于此  任凭后人勾勒`;

    case '政变失败':
    case 'FAILED_USURP':
      return `权力烈火  焚其残身\n野心勃兴  然根基未固\n棋差一招  倾覆于顷刻\n万象宫前  禁卫倒戈\n玄武门外  梦碎黎明\n成王败寇  古之常理\n乱臣之迹  覆于兵锋\n空留残碑  警示后世`;

    case '冷宫弃妃':
    case 'COLD_PALACE':
      return `长门灯暗  青灯影孤\n本有凌云之志  奈何步步踏错\n一朝失宠  权势如烟\n繁华梦断  身陷囹圄\n史册无名  名讳早没\n唯余荒冢残碑  不著一字\n没于草莽  任霜雪覆盖`;

    default:
      return `武氏讳曌  临朝称制\n权谋定鼎  仁德抚民\n革新除弊  守正持纲\n一生功过  是非难辨\n唯立此石  不著一字\n留与后人  评说千秋`;
  }
};