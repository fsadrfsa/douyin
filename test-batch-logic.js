const BATCH_SIZE = 10;
const maxVideos = 25;

let videosProcessed = 0;
let batchCount = 0;

console.log('=== 批次处理逻辑测试 ===\n');
console.log(`BATCH_SIZE: ${BATCH_SIZE}`);
console.log(`maxVideos: ${maxVideos}\n`);

for (let i = 0; i < maxVideos; i++) {
  videosProcessed++;
  console.log(`处理视频 ${videosProcessed}/${maxVideos}`);
  
  batchCount++;
  
  if (batchCount >= BATCH_SIZE && videosProcessed < maxVideos) {
    console.log(`\n📊 当前批次: ${batchCount} 个视频已处理`);
    console.log('🔄 达到批次限制，刷新浏览器会话...');
    console.log('  ✅ 浏览器会话刷新完成\n');
    batchCount = 0;
  }
}

console.log('\n=== 测试完成 ===');
console.log(`总处理视频: ${videosProcessed}`);
console.log(`预期刷新次数: ${Math.floor((maxVideos - 1) / BATCH_SIZE)}`);
