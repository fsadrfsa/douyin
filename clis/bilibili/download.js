import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

cli({
  site: 'bilibili',
  name: 'download',
  description: '下载B站视频（需要 yt-dlp）',
  strategy: Strategy.COOKIE,
  args: [
    { name: 'bvid', required: true, positional: true, help: 'Video BV ID (e.g., BV1xxx)' },
    { name: 'output', type: 'str', default: './bilibili-downloads', help: 'Output directory' },
    { name: 'video-format', type: 'str', default: 'bestvideo+bestaudio/best', help: 'Video format (yt-dlp format string)' },
    { name: 'audio_only', type: 'bool', default: false, help: 'Download audio only (mp3)' },
  ],
  columns: ['step', 'status', 'path'],
  func: async (page, kwargs) => {
    const { bvid, output, videoFormat, audio_only } = kwargs;
    
    const outputDir = path.resolve(output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const videoUrl = `https://www.bilibili.com/video/${bvid}`;
    
    const ytDlpArgs = [
      '--no-playlist',
      '--no-warnings',
      '--progress',
      '-o', path.join(outputDir, '%(title)s.%(ext)s'),
    ];

    if (audio_only) {
      ytDlpArgs.push(
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '0'
      );
    } else {
      ytDlpArgs.push(
        '-f', videoFormat,
        '--merge-output-format', 'mp4'
      );
    }

    ytDlpArgs.push(videoUrl);

    return new Promise((resolve, reject) => {
      const proc = spawn('python', ['-m', 'yt_dlp', ...ytDlpArgs], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          const files = fs.readdirSync(outputDir);
          const downloadedFile = files.find(f => 
            f.endsWith('.mp4') || f.endsWith('.mp3') || f.endsWith('.webm')
          );
          
          resolve([
            { step: 'download', status: '✅ 完成', path: downloadedFile ? path.join(outputDir, downloadedFile) : outputDir },
          ]);
        } else {
          reject(new CommandExecutionError(`yt-dlp failed with code ${code}: ${stderr || stdout}`));
        }
      });

      proc.on('error', (err) => {
        reject(new CommandExecutionError(`Failed to run yt-dlp: ${err.message}. Please ensure yt-dlp is installed.`));
      });
    });
  },
});
