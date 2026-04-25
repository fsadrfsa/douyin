const fs = require('fs');
const path = require('path');
const base = 'd:/opencli/douyin-videos/results';
const dirs = fs.readdirSync(base);
const result = [];
for (const d of dirs) {
  const mp = path.join(base, d, 'metadata.json');
  if (!fs.existsSync(mp)) continue;
  const m = JSON.parse(fs.readFileSync(mp, 'utf-8'));
  const vp = path.join(base, d, 'videos');
  if (!fs.existsSync(vp)) continue;
  const files = fs.readdirSync(vp).filter(f => f.endsWith('.json'));
  const keywords = [];
  const contents = [];
  for (const f of files) {
    const vj = JSON.parse(fs.readFileSync(path.join(vp, f), 'utf-8'));
    if (vj.keywords) keywords.push(...vj.keywords);
    if (vj.main_content) contents.push(vj.main_content.substring(0, 200));
  }
  result.push({
    name: m.blogger_name,
    dir: d,
    category: m.category,
    summary: m.summary,
    videoCount: files.length,
    keywords: [...new Set(keywords)],
    contentPreview: contents.slice(0, 3)
  });
}
console.log(JSON.stringify(result, null, 2));
