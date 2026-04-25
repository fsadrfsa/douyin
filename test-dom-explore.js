import { createPage } from './src/browser/page.js';

(async () => {
  const page = createPage();
  console.log('正在打开抖音搜索页面...');
  await page.goto('https://www.douyin.com/search/%E5%89%AF%E4%B8%9A?type=video');
  await page.wait(5);

  console.log('\n=== 探索DOM结构 ===\n');

  const result = await page.evaluate(`
    (() => {
      const info = {
        totalCards: 0,
        cardsWithVideo: 0,
        cardsWithoutVideo: 0,
        details: []
      };

      const cards = document.querySelectorAll('div.search-result-card');
      info.totalCards = cards.length;

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const videoLink = card.querySelector('a[href*="/video/"]');
        const href = videoLink ? videoLink.getAttribute('href') : null;
        const awemeId = href ? href.match(/video\\/(\\d+)/)?.[1] : null;

        const detail = {
          index: i,
          hasVideoLink: !!videoLink,
          awemeId: awemeId || null,
          className: card.className.substring(0, 50)
        };

        if (videoLink) {
          info.cardsWithVideo++;
        } else {
          info.cardsWithoutVideo++;
        }

        info.details.push(detail);
      }

      return info;
    })()
  `);

  console.log('统计结果:');
  console.log(`- 总卡片数: ${result.totalCards}`);
  console.log(`- 有视频链接: ${result.cardsWithVideo}`);
  console.log(`- 无视频链接: ${result.cardsWithoutVideo}`);
  console.log('\n详细信息:');
  console.log(JSON.stringify(result.details, null, 2));

  process.exit(0);
})();
