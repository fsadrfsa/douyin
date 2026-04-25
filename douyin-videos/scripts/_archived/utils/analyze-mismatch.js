import fs from 'fs';

const videos = JSON.parse(fs.readFileSync('d:/opencli/douyin-videos/data/videos.json', 'utf-8')).videos;

// 所有验证结果（合并三批）
const verifiedResults = [
  // 第一批 (1-50)
  {"aweme_id":"7289408724316245289","actual_author":"魏成说商业","actual_uid":"1648864883912472"},
  {"aweme_id":"7289404405076462902","actual_author":"魏成说商业","actual_uid":"1648864883912472"},
  {"aweme_id":"7289054201240390923","actual_author":"魏成说商业","actual_uid":"1648864883912472"},
  {"aweme_id":"7628189167612120366","actual_author":"魏成说商业","actual_uid":"1648864883912472"},
  {"aweme_id":"7627884202846997812","actual_author":"魏成说商业","actual_uid":"1648864883912472"},
  {"aweme_id":"7627454031195016502","actual_author":"魏成说商业","actual_uid":"1648864883912472"},
  {"aweme_id":"7627337793252986162","actual_author":"魏成说商业","actual_uid":"1648864883912472"},
  {"aweme_id":"7627116227273461043","actual_author":"魏成说商业","actual_uid":"1648864883912472"},
  {"aweme_id":"7627077336805952831","actual_author":"魏成说商业","actual_uid":"1648864883912472"},
  {"aweme_id":"7626729507977776424","actual_author":"魏成说商业","actual_uid":"1648864883912472"},
  {"aweme_id":"7593326528420817590","actual_author":"不屈者老王","actual_uid":"2971319073778378"},
  {"aweme_id":"7592958585831849636","actual_author":"不屈者老王","actual_uid":"2971319073778378"},
  {"aweme_id":"7592240027880706219","actual_author":"不屈者老王","actual_uid":"2971319073778378"},
  {"aweme_id":"7627076996425698610","actual_author":"RoSSo-音乐留学","actual_uid":"2218136583024008"},
  {"aweme_id":"7626778807122716550","actual_author":"不屈者老王","actual_uid":"2971319073778378"},
  {"aweme_id":"7615985261961093987","actual_author":"南贝·老李讲点子","actual_uid":"2223644221386148"},
  {"aweme_id":"7615607277919194368","actual_author":"南贝·老李讲点子","actual_uid":"2223644221386148"},
  {"aweme_id":"7614212108401577270","actual_author":"南贝·老李讲点子","actual_uid":"2223644221386148"},
  {"aweme_id":"7627478492619328818","actual_author":"南贝·老李讲点子","actual_uid":"2223644221386148"},
  {"aweme_id":"7627196406578646310","actual_author":"南贝·老李讲点子","actual_uid":"2223644221386148"},
  {"aweme_id":"7628056152446770870","actual_author":"原版英文教材课程供应（深圳智华图书）","actual_uid":"800918383112958"},
  {"aweme_id":"7604738758277156139","actual_author":"抽屉视频","actual_uid":"527401358471956"},
  {"aweme_id":"7581448347584630043","actual_author":"谷爷遵和文化(收徒)","actual_uid":"2502108350520855"},
  {"aweme_id":"7581043186546576666","actual_author":"谷爷遵和文化(收徒)","actual_uid":"2502108350520855"},
  {"aweme_id":"7580588469861256491","actual_author":"谷爷遵和文化(收徒)","actual_uid":"2502108350520855"},
  {"aweme_id":"7355735845468491034","actual_author":"大健康＆养老产业高导","actual_uid":"743684515568319"},
  {"aweme_id":"7215403284872318223","actual_author":"大健康＆养老产业高导","actual_uid":"743684515568319"},
  {"aweme_id":"7138261109768719657","actual_author":"大健康＆养老产业高导","actual_uid":"743684515568319"},
  {"aweme_id":"7585105084690730250","actual_author":"科学辟谣","actual_uid":"75866635985"},
  {"aweme_id":"7497275622465473833","actual_author":"学霸小班课刘老师","actual_uid":"57597775592636"},
  {"aweme_id":"7530491133370158355","actual_author":"徐不投","actual_uid":"1544127496861374"},
  {"aweme_id":"7522373395569282319","actual_author":"徐不投","actual_uid":"1544127496861374"},
  {"aweme_id":"7627749599792592357","actual_author":"天津华夏中等职业学校-张老师","actual_uid":"2085129922285166"},
  {"aweme_id":"7624800062266150184","actual_author":"徐不投","actual_uid":"1544127496861374"},
  {"aweme_id":"7624798920740277519","actual_author":"徐不投","actual_uid":"1544127496861374"},
  {"aweme_id":"7567661907520310547","actual_author":"放眼看世界","actual_uid":"100112453862"},
  {"aweme_id":"7503495271360302370","actual_author":"放眼看世界","actual_uid":"100112453862"},
  {"aweme_id":"7491213086477667636","actual_author":"放眼看世界","actual_uid":"100112453862"},
  {"aweme_id":"7627795375264742056","actual_author":"升学规划贺老师","actual_uid":"565562209474343"},
  {"aweme_id":"7624861324773690676","actual_author":"放眼看世界","actual_uid":"100112453862"},
  {"aweme_id":"7604779015525666099","actual_author":"人民政协网","actual_uid":"3117834334898173"},
  {"aweme_id":"7604690162732333553","actual_author":"杨小废","actual_uid":"1552964415390407"},
  {"aweme_id":"7571042973883844086","actual_author":"老高你好八戒","actual_uid":"3922658667807854"},
  {"aweme_id":"7569090100634953690","actual_author":"杨小废","actual_uid":"1552964415390407"},
  {"aweme_id":"7568053930601690098","actual_author":"杨小废","actual_uid":"1552964415390407"},
  {"aweme_id":"7561348852658523418","actual_author":"桃桃子","actual_uid":"395437185971667"},
  {"aweme_id":"7544708574720871706","actual_author":"桃桃子","actual_uid":"395437185971667"},
  {"aweme_id":"7531623425531514163","actual_author":"桃桃子","actual_uid":"395437185971667"},
  {"aweme_id":"7627743935074503955","actual_author":"86208310116","actual_uid":"802007812942688"},
  {"aweme_id":"7625597096511632238","actual_author":"桃桃子","actual_uid":"395437185971667"},
  // 第二批 (51-100)
  {"aweme_id":"7277800334175538443","actual_author":"钉钉00后","actual_uid":"2871551822661533"},
  {"aweme_id":"7224059494433688892","actual_author":"钉钉00后","actual_uid":"2871551822661533"},
  {"aweme_id":"7217078953192869175","actual_author":"钉钉00后","actual_uid":"2871551822661533"},
  {"aweme_id":"7626984743029304249","actual_author":"钉钉00后","actual_uid":"2871551822661533"},
  {"aweme_id":"7620385481485850277","actual_author":"钉钉00后","actual_uid":"2871551822661533"},
  {"aweme_id":"7595977073165340913","actual_author":"hello 阿敏","actual_uid":"1886394445997902"},
  {"aweme_id":"7542914041838193980","actual_author":"hello 阿敏","actual_uid":"1886394445997902"},
  {"aweme_id":"7537996551130615099","actual_author":"hello 阿敏","actual_uid":"1886394445997902"},
  {"aweme_id":"7627755513644135866","actual_author":"四海舞蹈(阳光校区)","actual_uid":"4051025410408125"},
  {"aweme_id":"7624434740670136549","actual_author":"hello 阿敏","actual_uid":"1886394445997902"},
  {"aweme_id":"7284215601499786531","actual_author":"圆脸鹅","actual_uid":"541396686091788"},
  {"aweme_id":"7244496987460996404","actual_author":"圆脸鹅","actual_uid":"541396686091788"},
  {"aweme_id":"7243782048966610191","actual_author":"圆脸鹅","actual_uid":"541396686091788"},
  {"aweme_id":"7627649392925081009","actual_author":"大燕.探固镇（陈记酸菜鱼土产巷中段82号","actual_uid":"101801802082"},
  {"aweme_id":"7622204247291138164","actual_author":"圆脸鹅","actual_uid":"541396686091788"},
  {"aweme_id":"7534701987246837043","actual_author":"装窗不装X","actual_uid":"96966239978"},
  {"aweme_id":"7530241680663399690","actual_author":"装窗不装X","actual_uid":"96966239978"},
  {"aweme_id":"7623955934364110106","actual_author":"装窗不装X","actual_uid":"96966239978"},
  {"aweme_id":"7618182865049718050","actual_author":"装窗不装X","actual_uid":"96966239978"},
  {"aweme_id":"7617811447887695139","actual_author":"装窗不装X","actual_uid":"96966239978"},
  {"aweme_id":"7455141257002634531","actual_author":"车神张全国长途代驾","actual_uid":"85037679230"},
  {"aweme_id":"7332645968543780136","actual_author":"车神张全国长途代驾","actual_uid":"85037679230"},
  {"aweme_id":"7329565826623753524","actual_author":"车神张全国长途代驾","actual_uid":"85037679230"},
  {"aweme_id":"7622603211442494900","actual_author":"车神张全国长途代驾","actual_uid":"85037679230"},
  {"aweme_id":"7621971931701449128","actual_author":"车神张全国长途代驾","actual_uid":"85037679230"},
  {"aweme_id":"7485712585254358306","actual_author":"智慧少女派","actual_uid":"109272561468"},
  {"aweme_id":"7450432490247867708","actual_author":"智慧少女派","actual_uid":"109272561468"},
  {"aweme_id":"7177723491771305276","actual_author":"智慧少女派","actual_uid":"109272561468"},
  {"aweme_id":"7628037172935457915","actual_author":"智慧少女派","actual_uid":"109272561468"},
  {"aweme_id":"7627114772748926907","actual_author":"智慧少女派","actual_uid":"109272561468"},
  {"aweme_id":"7614860801966689529","actual_author":"锐奕文化","actual_uid":"22735880964"},
  {"aweme_id":"7628088679457954149","actual_author":"锐奕文化","actual_uid":"22735880964"},
  {"aweme_id":"7627831277605228467","actual_author":"大连新途径-朱老师","actual_uid":"2016984545112244"},
  {"aweme_id":"7627763512894589669","actual_author":"锐奕文化","actual_uid":"22735880964"},
  {"aweme_id":"7627348584523280881","actual_author":"锐奕文化","actual_uid":"22735880964"},
  {"aweme_id":"7541721507668479242","actual_author":"Xuan酱","actual_uid":"68445633427"},
  {"aweme_id":"7513939231652285730","actual_author":"Xuan酱","actual_uid":"68445633427"},
  {"aweme_id":"7627783180472292559","actual_author":"MindfulBarista_Tammy","actual_uid":"7626734448583296059"},
  {"aweme_id":"7626985836554226994","actual_author":"火山引擎","actual_uid":"2849562992849757"},
  {"aweme_id":"7628055866382690011","actual_author":"央国企求职课堂 ✔","actual_uid":"4443594504542032"},
  {"aweme_id":"7627461852934475017","actual_author":"木申洞察","actual_uid":"3112058366203227"},
  {"aweme_id":"7620456051501993268","actual_author":"木申洞察","actual_uid":"3112058366203227"},
  {"aweme_id":"7619909114684083462","actual_author":"木申洞察","actual_uid":"3112058366203227"},
  {"aweme_id":"7615639087139015951","actual_author":"木申洞察","actual_uid":"3112058366203227"},
  {"aweme_id":"7627943505494576426","actual_author":"唯创书屋","actual_uid":"7456699846994117692"},
  {"aweme_id":"7627875045548854543","actual_author":"杜恩泽·AI分享与思考","actual_uid":"3162639043660254"},
  {"aweme_id":"7627379171760639272","actual_author":"杜恩泽·AI分享与思考","actual_uid":"3162639043660254"},
  {"aweme_id":"7626638747240566079","actual_author":"杜恩泽·AI分享与思考","actual_uid":"3162639043660254"},
  {"aweme_id":"7626367952475950376","actual_author":"杜恩泽·AI分享与思考","actual_uid":"3162639043660254"},
  // 第三批 (101-106)
  {"aweme_id":"7611517107374230790","actual_author":"鱼幼微情报舍","actual_uid":"72477029672"},
  {"aweme_id":"7628141937224191270","actual_author":"杨妈英语冲刺 I","actual_uid":"3291299561085146"},
  {"aweme_id":"7627858762497401716","actual_author":"豆豆啃书ing","actual_uid":"362168826742283"},
  {"aweme_id":"7628172830085106995","actual_author":"美少女日语","actual_uid":"2461176211971168"},
  {"aweme_id":"7627660314398526185","actual_author":"民艺朱校长","actual_uid":"2513952044507003"},
  {"aweme_id":"7627605164219764004","actual_author":"丰衍书苑","actual_uid":"3634344017017802"}
];

// 创建验证结果映射
const verifiedMap = new Map();
verifiedResults.forEach(r => verifiedMap.set(r.aweme_id, r));

// 对比分析
const mismatched = [];
const matched = [];
const notVerified = [];

videos.forEach(v => {
  const verified = verifiedMap.get(v.aweme_id);
  if (!verified) {
    notVerified.push(v);
    return;
  }
  
  // 检查 author_id 是否匹配
  if (v.author_id && v.author_id !== verified.actual_uid) {
    mismatched.push({
      aweme_id: v.aweme_id,
      stored_author: v.author,
      stored_author_id: v.author_id,
      actual_author: verified.actual_author,
      actual_uid: verified.actual_uid,
      collect_time: v.collect_time
    });
  } else {
    matched.push({
      aweme_id: v.aweme_id,
      author: v.author,
      author_id: v.author_id
    });
  }
});

console.log('=== 验证结果统计 ===');
console.log('已验证: ' + verifiedResults.length);
console.log('匹配: ' + matched.length);
console.log('不匹配: ' + mismatched.length);
console.log('未验证: ' + notVerified.length);

console.log('\n=== 不匹配视频列表 ===');
mismatched.forEach((m, i) => {
  console.log((i+1) + '. ' + m.aweme_id);
  console.log('   存储: ' + m.stored_author + ' (' + m.stored_author_id + ')');
  console.log('   实际: ' + m.actual_author + ' (' + m.actual_uid + ')');
  console.log('   收集时间: ' + m.collect_time);
});

// 保存不匹配视频ID列表
fs.writeFileSync('d:/opencli/douyin-videos/mismatched-videos.json', JSON.stringify(mismatched, null, 2));
console.log('\n不匹配视频列表已保存到: d:/opencli/douyin-videos/mismatched-videos.json');
