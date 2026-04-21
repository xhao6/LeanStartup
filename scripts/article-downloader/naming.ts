import fs from "node:fs";
import path from "node:path";

/**
 * 从页面标题生成安全的文件名片段。
 * 去除特殊字符，截断到 40 字符。
 */
export function sanitizeTitle(title: string): string {
  return title
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .slice(0, 40) || "untitled";
}

/**
 * 格式化日期为 YYMMDD。
 */
export function formatDateYYMMDD(date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

/**
 * 扫描输出目录下已有的编号，返回下一个可用编号。
 * 目录名格式: 100001-YYMMDD-标题
 * 如果目录为空或不存在，返回 100001。
 */
export function getNextId(outputDir: string): number {
  if (!fs.existsSync(outputDir)) return 100001;

  const entries = fs.readdirSync(outputDir, { withFileTypes: true });
  let maxId = 100000;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(/^(\d{6})-/);
    if (match) {
      const id = parseInt(match[1], 10);
      if (id > maxId) maxId = id;
    }
  }

  return maxId + 1;
}

/**
 * 生成目录名: 100001-260421-文章标题
 */
export function buildDirName(id: number, title: string, date?: Date): string {
  const idStr = String(id).padStart(6, "0");
  const dateStr = formatDateYYMMDD(date);
  const safeTitle = sanitizeTitle(title);
  return `${idStr}-${dateStr}-${safeTitle}`;
}

/**
 * 生成完整的输出路径。
 */
export function buildOutputPath(
  outputDir: string,
  id: number,
  title: string,
  date?: Date
): string {
  return path.join(outputDir, buildDirName(id, title, date));
}
