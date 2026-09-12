import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function markdownToHtml(md: string): string {
  return md
    .replace(
      /^# (.*$)/gim,
      '<h1 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem; color: #fff;">$1</h1>',
    )
    .replace(
      /^## (.*$)/gim,
      '<h2 style="font-size: 1.25rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #38bdf8;">$1</h2>',
    )
    .replace(
      /^### (.*$)/gim,
      '<h3 style="font-size: 1rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.25rem; color: #e2e8f0;">$1</h3>',
    )
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(
      /`([^`]+)`/gim,
      '<code style="background: rgba(0,0,0,0.4); padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: monospace;">$1</code>',
    )
    .replace(/\n\n/gim, '</p><p style="margin-bottom: 1rem; line-height: 1.6; color: #94a3b8;">')
    .replace(/\n/gim, '<br>');
}

export function renderLegalHtml(title: string, markdownFilename: string): string {
  let contentHtml = '<p>Document not found.</p>';
  const filePath = resolve(process.cwd(), markdownFilename);
  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, 'utf8');
      contentHtml = `<p style="margin-bottom: 1rem; line-height: 1.6; color: #94a3b8;">${markdownToHtml(raw)}</p>`;
    } catch {
      contentHtml = '<p>Failed to load document content.</p>';
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} · HELIX RSS</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0b0f19; color: #f3f4f6; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 2rem 1rem; }
    .card { background: #111827; border: 1px solid #1f2937; border-radius: 1.25rem; padding: 2.5rem; max-width: 800px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 1px solid #1f2937; padding-bottom: 1rem; }
    .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.5rem; background: #1f2937; color: #d1d5db; font-size: 0.8125rem; font-weight: 600; text-decoration: none; border: 1px solid #374151; }
    .btn:hover { background: #374151; color: #fff; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <a href="/dashboard" style="display: flex; align-items: center; gap: 0.5rem; color: #fff; text-decoration: none; font-weight: 800; font-size: 1.1rem;">
        <i class="fa-solid fa-rss" style="color: #06b6d4;"></i> HELIX <span style="color: #06b6d4;">RSS</span>
      </a>
      <a href="/dashboard" class="btn"><i class="fa-solid fa-arrow-left"></i> Return to Dashboard</a>
    </div>
    <div>${contentHtml}</div>
  </div>
</body>
</html>`;
}
