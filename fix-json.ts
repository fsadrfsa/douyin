import fs from 'fs';

const filePath = 'd:/opencli/douyin-videos/data/videos.json';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/^\uFEFF/, '');

content = content.replace(/\s+/g, ' ');
content = content.replace(/\s*([{}[\]:,])\s*/g, '$1');
content = content.replace(/"/g, '"');
content = content.replace(/"/g, '"');

try {
  const data = JSON.parse(content);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log('JSON fixed successfully');
} catch (e) {
  console.log('Parse error, trying alternative...');
  
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const cleaned = lines.map(line => 
    line.replace(/":\s+/g, '": ')
        .replace(/:\s+"/g, ': "')
        .replace(/:\s+\[/g, ': [')
        .replace(/:\s+\{/g, ': {')
  ).join('\n');
  
  try {
    const data = JSON.parse(cleaned);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log('JSON fixed with alternative method');
  } catch (e2) {
    console.log('Still failed:', e2.message);
  }
}
