import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const demoRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(demoRoot, '..', '..');

const sourcePrd = path.join(workspaceRoot, '02_产品方案', 'PRD_正式版.md');
const sourceNotification = path.join(workspaceRoot, '02_产品方案', '通知与提醒原始梳理.md');
const sourceImageDir = path.join(workspaceRoot, '02_产品方案', '图示');

const publicDir = path.join(demoRoot, 'public');
const outputPrd = path.join(publicDir, 'prd.md');
const outputNotification = path.join(publicDir, 'notification.md');
const outputImageDir = path.join(publicDir, '图示');

function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function rewriteMarkdownAssetPaths(markdown) {
  return markdown
    .replace(/\]\(图示\//g, '](/图示/')
    .replace(/src="图示\//g, 'src="/图示/');
}

function copyMarkdown(sourcePath, outputPath, transform) {
  const markdown = readFileSync(sourcePath, 'utf8');
  const content = transform ? transform(markdown) : markdown;
  writeFileSync(outputPath, content, 'utf8');
}

ensureDir(publicDir);
copyMarkdown(sourcePrd, outputPrd, rewriteMarkdownAssetPaths);
copyMarkdown(sourceNotification, outputNotification);

if (existsSync(outputImageDir)) {
  rmSync(outputImageDir, { recursive: true, force: true });
}

cpSync(sourceImageDir, outputImageDir, { recursive: true });
