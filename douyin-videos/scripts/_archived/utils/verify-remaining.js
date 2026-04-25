import fs from 'fs';

const videos = JSON.parse(fs.readFileSync('d:/opencli/douyin-videos/data/videos.json', 'utf-8')).videos;

// 所有新验证结果
const newVerified = [
  // 批次 1
  {"aweme_id":"7491652976788933946","actual_author":"熊迪来了","actual_uid":"1371844331965527"},
  {"aweme_id":"7441922577682976057","actual_author":"熊迪来了","actual_uid":"1371844331965527"},
  {"aweme_id":"7348666697651457295","actual_author":"熊迪来了","actual_uid":"1371844331965527"},
  {"aweme_id":"7627841578949741859","actual_author":"坐观","actual_uid":"1171417070314848"},
  {"aweme_id":"7626664014097042688","actual_author":"熊迪来了","actual_uid":"1371844331965527"},
  {"aweme_id":"7586290281722268965","actual_author":"小猫说🐱","actual_uid":"3576026468716876"},
  {"aweme_id":"7546212425998454074","actual_author":"小猫说🐱","actual_uid":"3576026468716876"},
  {"aweme_id":"7541776611390836025","actual_author":"小猫说🐱","actual_uid":"3576026468716876"},
  {"aweme_id":"7627884802117638121","actual_author":"JC也屿🔥","actual_uid":"73675770810"},
  {"aweme_id":"7626972280921135077","actual_author":"小猫说🐱","actual_uid":"3576026468716876"},
  {"aweme_id":"7514926074254396712","actual_author":"-起航ˢᵗᵃʳᵗ","actual_uid":"715119643602425"},
  {"aweme_id":"7460182199321578778","actual_author":"-起航ˢᵗᵃʳᵗ","actual_uid":"715119643602425"},
  {"aweme_id":"7440126446787415330","actual_author":"-起航ˢᵗᵃʳᵗ","actual_uid":"715119643602425"},
  {"aweme_id":"7627843617079528745","actual_author":"为真·曹忆教实验","actual_uid":"2086188210202327"},
  {"aweme_id":"7605576134508369317","actual_author":"小珠桃子","actual_uid":"646925639230285"},
  {"aweme_id":"7578459888872438137","actual_author":"99年的老男人","actual_uid":"3183808760513219"},
  {"aweme_id":"7556690397273361721","actual_author":"99年的老男人","actual_uid":"3183808760513219"},
  {"aweme_id":"7372940663706504474","actual_author":"99年的老男人","actual_uid":"3183808760513219"},
  {"aweme_id":"7628066286056099081","actual_author":"深圳新航道国际教育","actual_uid":"618366615952364"},
  {"aweme_id":"7627926047225506171","actual_author":"99年的老男人","actual_uid":"3183808760513219"},
  {"aweme_id":"7620110047695146278","actual_author":"严肃的虾米","actual_uid":"3210176909024511"},
  {"aweme_id":"7603555662026657074","actual_author":"严肃的虾米","actual_uid":"3210176909024511"},
  {"aweme_id":"7516706971316161842","actual_author":"严肃的虾米","actual_uid":"3210176909024511"},
  {"aweme_id":"7628068536322508788","actual_author":"嵩山少林小龙武校（新生报名处）","actual_uid":"3323182659681884"},
  {"aweme_id":"7609326947374320575","actual_author":"李帮主流浪记","actual_uid":"3751158090575532"},
  {"aweme_id":"7595817076854706102","actual_author":"李帮主流浪记","actual_uid":"3751158090575532"},
  {"aweme_id":"7522389277729475876","actual_author":"李帮主流浪记","actual_uid":"3751158090575532"},
  {"aweme_id":"7628167041081572287","actual_author":"鲁师艺体生文化课（大学城校区）石老师","actual_uid":"1567223553735769"},
  {"aweme_id":"7627308904947455734","actual_author":"李帮主流浪记","actual_uid":"3751158090575532"},
  {"aweme_id":"7557971392860327207","actual_author":"叫我小葛","actual_uid":"88384151228446"},
  {"aweme_id":"7626353719130590510","actual_author":"叫我小葛","actual_uid":"88384151228446"},
  {"aweme_id":"7624000515218722099","actual_author":"叫我小葛","actual_uid":"88384151228446"},
  {"aweme_id":"7620299899065748776","actual_author":"叫我小葛","actual_uid":"88384151228446"},
  {"aweme_id":"7617757203184912315","actual_author":"叫我小葛","actual_uid":"88384151228446"},
  {"aweme_id":"7597058798553025811","actual_author":"行者","actual_uid":"262134904659019"},
  {"aweme_id":"7592789891692367139","actual_author":"行者","actual_uid":"262134904659019"},
  {"aweme_id":"7627852092736032041","actual_author":"时代图书小慧","actual_uid":"239056704253561"},
  {"aweme_id":"7625626839884598537","actual_author":"行者","actual_uid":"262134904659019"},
  {"aweme_id":"7625625972372475174","actual_author":"行者","actual_uid":"262134904659019"},
  {"aweme_id":"7625241321595466410","actual_author":"欣姐讲爆品（摆摊版）","actual_uid":"1226698175297965"},
  {"aweme_id":"7622264628413222399","actual_author":"欣姐讲爆品（摆摊版）","actual_uid":"1226698175297965"},
  {"aweme_id":"7503907653778984246","actual_author":"欣姐讲爆品（摆摊版）","actual_uid":"1226698175297965"},
  {"aweme_id":"7627850408292194212","actual_author":"欣姐讲爆品（摆摊版）","actual_uid":"1226698175297965"},
  {"aweme_id":"7627464332138110655","actual_author":"欣姐讲爆品（摆摊版）","actual_uid":"1226698175297965"},
  {"aweme_id":"7588138734782076763","actual_author":"永不失焦的奇观🌻","actual_uid":"273118393010859"},
  {"aweme_id":"7497945238426668326","actual_author":"是李小小呀","actual_uid":"4290764628586116"},
  {"aweme_id":"7496845627901381938","actual_author":"是李小小呀","actual_uid":"4290764628586116"},
  {"aweme_id":"7496344390537923891","actual_author":"是李小小呀","actual_uid":"4290764628586116"},
  // 批次 2
  {"aweme_id":"7388143696820145419","actual_author":"MD一束光～旋","actual_uid":"4312709511264989"},
  {"aweme_id":"7599940459447749894","actual_author":"摆摊创业计划","actual_uid":"3661839332032051"},
  {"aweme_id":"7598115081058110766","actual_author":"摆摊创业计划","actual_uid":"3661839332032051"},
  {"aweme_id":"7598107376197143851","actual_author":"摆摊创业计划","actual_uid":"3661839332032051"},
  {"aweme_id":"7626696312053943606","actual_author":"摆摊创业计划","actual_uid":"3661839332032051"},
  {"aweme_id":"7626329214148562211","actual_author":"摆摊创业计划","actual_uid":"3661839332032051"},
  {"aweme_id":"7627456174228557082","actual_author":"大雷子","actual_uid":"1326477579948826"},
  {"aweme_id":"7627446974345661723","actual_author":"大雷子","actual_uid":"1326477579948826"},
  {"aweme_id":"7627075598363479334","actual_author":"大雷子","actual_uid":"1326477579948826"},
  {"aweme_id":"7626696180113657115","actual_author":"大雷子","actual_uid":"1326477579948826"},
  {"aweme_id":"7626332763603373338","actual_author":"大雷子","actual_uid":"1326477579948826"},
  {"aweme_id":"7600322838968519974","actual_author":"斜杠青年小冯","actual_uid":"3426546545866264"},
  {"aweme_id":"7591454237813394738","actual_author":"斜杠青年小冯","actual_uid":"3426546545866264"},
  {"aweme_id":"7586290342878514441","actual_author":"斜杠青年小冯","actual_uid":"3426546545866264"},
  {"aweme_id":"7551745602738130235","actual_author":"丽丽@","actual_uid":"74840263764"},
  {"aweme_id":"7546913601295650108","actual_author":"丽丽@","actual_uid":"74840263764"},
  {"aweme_id":"7166568667549814056","actual_author":"丽丽@","actual_uid":"74840263764"},
  {"aweme_id":"7628194388677521082","actual_author":"丽丽@","actual_uid":"74840263764"},
  {"aweme_id":"7628086661234068799","actual_author":"一本官方旗舰店","actual_uid":"3325355569719341"},
  {"aweme_id":"7628068053817792882","actual_author":"江西高考刘老师","actual_uid":"3288017739193812"},
  {"aweme_id":"7609649236702956810","actual_author":"扬子晚报","actual_uid":"99061005584"},
  {"aweme_id":"7530529190270438715","actual_author":"羊2的三亩良田","actual_uid":"88815586739"},
  {"aweme_id":"7522425115101187387","actual_author":"破而后立-何天下","actual_uid":"7441128777910256697"},
  {"aweme_id":"7522148396715560252","actual_author":"破而后立-何天下","actual_uid":"7441128777910256697"},
  {"aweme_id":"7618156699924401442","actual_author":"第四种黑猩猩","actual_uid":"2955957561736269"},
  {"aweme_id":"7545026481504685321","actual_author":"彤彤：有氧健身操（晚上8.20直播）","actual_uid":"1223122008150093"},
  {"aweme_id":"7428944360399441167","actual_author":"山西晋东","actual_uid":"98288951634"},
  {"aweme_id":"7337612513292356891","actual_author":"打印机维修王同学","actual_uid":"81329469567"},
  {"aweme_id":"7336499419988217129","actual_author":"吉祥","actual_uid":"1468550549079262"},
  {"aweme_id":"7627763656009529585","actual_author":"啊杜","actual_uid":"706322631766045"},
  {"aweme_id":"7627082037426476273","actual_author":"啊杜","actual_uid":"706322631766045"},
  {"aweme_id":"7626338570529177850","actual_author":"啊杜","actual_uid":"706322631766045"},
  {"aweme_id":"7625618280841059505","actual_author":"啊杜","actual_uid":"706322631766045"},
  {"aweme_id":"7544481967913766154","actual_author":"炸串哥聊摆摊","actual_uid":"4082907484784460"},
  {"aweme_id":"7538547240844479754","actual_author":"炸串哥聊摆摊","actual_uid":"4082907484784460"},
  {"aweme_id":"7510930521213357349","actual_author":"炸串哥聊摆摊","actual_uid":"4082907484784460"},
  {"aweme_id":"7627964628895791497","actual_author":"炸串哥聊摆摊","actual_uid":"4082907484784460"},
  {"aweme_id":"7627611178608785481","actual_author":"炸串哥聊摆摊","actual_uid":"4082907484784460"},
  {"aweme_id":"7624071001929062833","actual_author":"老朝创业圈（朝瑶加盟）","actual_uid":"61854177638"},
  {"aweme_id":"7444552634800950585","actual_author":"老朝创业圈（朝瑶加盟）","actual_uid":"61854177638"},
  {"aweme_id":"7628094348001817018","actual_author":"老朝创业圈（朝瑶加盟）","actual_uid":"61854177638"},
  {"aweme_id":"7627898273227920505","actual_author":"老朝创业圈（朝瑶加盟）","actual_uid":"61854177638"},
  {"aweme_id":"7502209293786434856","actual_author":"冷水轻创业","actual_uid":"175569400238493"},
  {"aweme_id":"7207334405700848955","actual_author":"冷水轻创业","actual_uid":"175569400238493"},
  {"aweme_id":"7204276951970860345","actual_author":"冷水轻创业","actual_uid":"175569400238493"},
  {"aweme_id":"7627917224645183347","actual_author":"冷水轻创业","actual_uid":"175569400238493"},
  {"aweme_id":"7442358901506346297","actual_author":"老郭餐饮创业","actual_uid":"4432870892644766"},
  {"aweme_id":"7326603351666249012","actual_author":"老郭餐饮创业","actual_uid":"4432870892644766"},
  {"aweme_id":"7237477508419947811","actual_author":"老郭餐饮创业","actual_uid":"4432870892644766"},
  // 批次 3
  {"aweme_id":"7627887181986861477","actual_author":"老郭餐饮创业","actual_uid":"4432870892644766"},
  {"aweme_id":"7037430470958681381","actual_author":"沐风侃大山","actual_uid":"729698112110830"}
];

// 创建验证结果映射
const verifiedMap = new Map();
newVerified.forEach(r => verifiedMap.set(r.aweme_id, r));

// 对比分析
const mismatched = [];
const matched = [];

videos.forEach(v => {
  const verified = verifiedMap.get(v.aweme_id);
  if (!verified) return;
  
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
console.log('已验证: ' + newVerified.length);
console.log('匹配: ' + matched.length);
console.log('不匹配: ' + mismatched.length);

if (mismatched.length > 0) {
  console.log('\n=== 不匹配视频列表 ===');
  mismatched.forEach((m, i) => {
    console.log((i+1) + '. ' + m.aweme_id);
    console.log('   存储: ' + m.stored_author + ' (' + m.stored_author_id + ')');
    console.log('   实际: ' + m.actual_author + ' (' + m.actual_uid + ')');
  });

  // 删除不匹配视频
  const mismatchedIds = new Set(mismatched.map(m => m.aweme_id));
  const data = JSON.parse(fs.readFileSync('d:/opencli/douyin-videos/data/videos.json', 'utf-8'));
  const originalCount = data.videos.length;
  data.videos = data.videos.filter(v => !mismatchedIds.has(v.aweme_id));
  const newCount = data.videos.length;
  
  fs.writeFileSync('d:/opencli/douyin-videos/data/videos.json', JSON.stringify(data, null, 2));
  
  console.log('\n已删除 ' + mismatchedIds.size + ' 个不匹配视频');
  console.log('原始: ' + originalCount + ', 剩余: ' + newCount);
} else {
  console.log('\n所有视频都匹配！');
}
