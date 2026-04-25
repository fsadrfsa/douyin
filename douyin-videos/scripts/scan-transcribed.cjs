const fs = require('fs');
const path = require('path');

const resultsDir = 'd:/opencli/douyin-videos/results';
const transDir = 'd:/opencli/douyin-videos/transcripts';
const cleanedDir = 'd:/opencli/douyin-videos/data/cleaned-results';

let stats = {};
let needClean = [];

const transFiles = fs.readdirSync(transDir).filter(f => f.endsWith('.txt'));
const transIds = new Set(transFiles.map(f => f.replace('.txt', '')));

const dirs = fs.readdirSync(resultsDir);
dirs.forEach(d => {
  const vDir = path.join(resultsDir, d, 'videos');
  if (fs.existsSync(vDir)) {
    const files = fs.readdirSync(vDir).filter(f => f.endsWith('.json'));
    files.forEach(f => {
      try {
        const v = JSON.parse(fs.readFileSync(path.join(vDir, f), 'utf-8'));
        const s = v.stage4_status || v.status || 'unknown';
        stats[s] = (stats[s] || 0) + 1;
        const vid = v.aweme_id || f.replace('.json', '');
        if (transIds.has(vid)) {
          const cPath = path.join(cleanedDir, vid + '.json');
          if (!fs.existsSync(cPath)) {
            needClean.push({ id: vid, author: v.author || d, status: s });
          }
        }
      } catch (e) {}
    });
  }
});

console.log('results视频状态:', JSON.stringify(stats));
console.log('有转录但未整理:', needClean.length);
needClean.forEach(v => console.log(v.id, '|', v.author, '|', v.status));
