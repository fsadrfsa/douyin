import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';

cli({
  site: 'bilibili',
  name: 'playurl',
  description: '获取B站视频下载链接（音频/视频）',
  strategy: Strategy.PUBLIC,
  args: [
    { name: 'bvid', required: true, positional: true, help: 'BV ID (e.g., BV1xxx) 或视频链接' },
    { name: 'audio_only', type: 'bool', default: false, help: '只返回音频链接' },
  ],
  columns: ['type', 'quality', 'url', 'size'],
  func: async (page, kwargs) => {
    const { bvid, audio_only } = kwargs;
    
    const bvidMatch = bvid.match(/BV[a-zA-Z0-9]+/);
    const cleanBvid = bvidMatch ? bvidMatch[0] : bvid;
    
    const viewUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${cleanBvid}`;
    const viewResp = await fetch(viewUrl, {
      headers: { 'Referer': 'https://www.bilibili.com' }
    });
    const viewData = await viewResp.json();
    
    if (viewData.code !== 0) {
      throw new CommandExecutionError(`获取视频信息失败: ${viewData.message}`);
    }
    
    const aid = viewData.data.aid;
    const cid = viewData.data.cid;
    const title = viewData.data.title;
    const duration = viewData.data.duration;
    
    const playUrl = `https://api.bilibili.com/x/player/wbi/playurl?bvid=${cleanBvid}&cid=${cid}&fnval=4048&qn=64`;
    const playResp = await fetch(playUrl, {
      headers: { 'Referer': 'https://www.bilibili.com' }
    });
    const playData = await playResp.json();
    
    if (playData.code !== 0) {
      throw new CommandExecutionError(`获取播放链接失败: ${playData.message}`);
    }
    
    const results = [];
    const dash = playData.data.dash;
    
    if (!audio_only && dash.video && dash.video.length > 0) {
      const video = dash.video[0];
      results.push({
        type: 'video',
        quality: `${video.width}x${video.height} (${video.codecs})`,
        url: video.baseUrl || video.base_url,
        size: `${Math.round((video.size || 0) / 1024 / 1024)}MB`
      });
    }
    
    if (dash.audio && dash.audio.length > 0) {
      const audio = dash.audio[0];
      results.push({
        type: 'audio',
        quality: `${audio.codecs} (${Math.round(audio.bandwidth / 1000)}kbps)`,
        url: audio.baseUrl || audio.base_url,
        size: `${Math.round((audio.size || 0) / 1024 / 1024)}MB`
      });
    }
    
    results.push({
      type: 'metadata',
      quality: title,
      url: `aid=${aid}, cid=${cid}, duration=${duration}s`,
      size: ''
    });
    
    return results;
  },
});
