import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getThemeInfo } from './dashboard.js';

function inlineFormat(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => {
      const isExternal = /^https?:\/\//i.test(href);
      return `<a href="${href}"${isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''} style="color: var(--primary); text-decoration: underline;">${label}</a>`;
    })
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(
      /`([^`]+)`/g,
      '<code style="background: rgba(0,0,0,0.4); padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: monospace; color: var(--primary);">$1</code>',
    );
}

function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const closeList = (): void => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === '') {
      closeList();
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      closeList();
      out.push('<hr style="border: none; border-top: 1px solid var(--border); margin: 1.5rem 0;">');
      continue;
    }

    // Headings (h1-h3)
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      const headingStyle =
        level === 1
          ? 'font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem; color: var(--text);'
          : level === 2
            ? 'font-size: 1.25rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.5rem; color: var(--primary);'
            : 'font-size: 1rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.25rem; color: var(--text);';
      out.push(`<h${level} style="${headingStyle}">${inlineFormat(heading[2])}</h${level}>`);
      continue;
    }

    // Unordered list item
    const ulItem = line.match(/^[-*]\s+(.*)$/);
    if (ulItem) {
      if (listType !== 'ul') {
        closeList();
        out.push(
          '<ul style="margin: 0.5rem 0 1rem 1.5rem; padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.4rem;">',
        );
        listType = 'ul';
      }
      out.push(`<li>${inlineFormat(ulItem[1])}</li>`);
      continue;
    }

    // Ordered list item
    const olItem = line.match(/^\d+[.)]\s+(.*)$/);
    if (olItem) {
      if (listType !== 'ol') {
        closeList();
        out.push(
          '<ol style="margin: 0.5rem 0 1rem 1.5rem; padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.4rem;">',
        );
        listType = 'ol';
      }
      out.push(`<li>${inlineFormat(olItem[1])}</li>`);
      continue;
    }

    // Paragraph
    closeList();
    out.push(`<p style="margin-bottom: 1rem; line-height: 1.6; color: var(--text-muted);">${inlineFormat(line)}</p>`);
  }

  closeList();
  return out.join('\n');
}

export function renderLegalHtml(
  title: string,
  markdownFilename: string,
  appName = 'HELIX RSS',
  appIconUrl?: string | null,
  themeConfig?: string,
): string {
  const theme = getThemeInfo(themeConfig);
  let contentHtml = '<p>Document not found.</p>';
  const filePath = resolve(process.cwd(), markdownFilename);
  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, 'utf8');
      contentHtml = markdownToHtml(raw);
    } catch {
      contentHtml = '<p>Failed to load document content.</p>';
    }
  }

  return `<!DOCTYPE html>
<html lang="en" class="${theme.id}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} · ${appName}</title>
  ${appIconUrl ? `<link rel="icon" type="image/png" href="${appIconUrl}">` : ''}
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root, html.dark {
      --bg: #0b0f19;
      --card-bg: rgba(17, 24, 39, 0.85);
      --card-inner: #111827;
      --border: #1f2937;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --primary: #06b6d4;
    }
    html.light {
      --bg: #e8ecf2;
      --card-bg: rgba(248, 250, 252, 0.95);
      --card-inner: #ffffff;
      --border: #cbd5e1;
      --text: #1e293b;
      --text-muted: #475569;
      --primary: #0284c7;
    }
    html.glassmorphism {
      --bg: #0a0d18;
      --card-bg: rgba(18, 24, 43, 0.55);
      --card-inner: rgba(255, 255, 255, 0.04);
      --border: rgba(255, 255, 255, 0.12);
      --text: #ffffff;
      --text-muted: #cbd5e1;
      --primary: #a855f7;
    }
    html.glassmorphism body {
      background: radial-gradient(circle at 15% 15%, rgba(168, 85, 247, 0.18), transparent 35%),
                  radial-gradient(circle at 85% 20%, rgba(6, 182, 212, 0.18), transparent 35%),
                  radial-gradient(circle at 50% 85%, rgba(236, 72, 153, 0.15), transparent 45%),
                  #0a0d18;
      background-attachment: fixed;
    }
    html.glassmorphism .card {
      backdrop-filter: blur(20px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37) !important;
    }
    html.cyberpunk {
      --bg: #05050a;
      --card-bg: rgba(14, 14, 24, 0.92);
      --card-inner: #0a0a12;
      --border: rgba(0, 240, 255, 0.25);
      --text: #fcee0a;
      --text-muted: #e2e8f0;
      --primary: #00f0ff;
    }
    html.dracula {
      --bg: #282a36;
      --card-bg: rgba(40, 42, 54, 0.92);
      --card-inner: #21222c;
      --border: #44475a;
      --text: #f8f8f2;
      --text-muted: #bd93f9;
      --primary: #ff79c6;
    }
    html.nord {
      --bg: #2e3440;
      --card-bg: rgba(46, 52, 64, 0.95);
      --card-inner: #3b4252;
      --border: #434c5e;
      --text: #eceff4;
      --text-muted: #d8dee9;
      --primary: #88c0d0;
    }
    html.emerald {
      --bg: #041712;
      --card-bg: rgba(6, 38, 28, 0.9);
      --card-inner: #07261d;
      --border: #134e3a;
      --text: #ecfdf5;
      --text-muted: #a7f3d0;
      --primary: #10b981;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 2rem 1rem; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 1.25rem; padding: 2.5rem; max-width: 800px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); backdrop-filter: blur(16px); }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem; }
    .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.5rem; background: var(--card-inner); color: var(--text); font-size: 0.8125rem; font-weight: 600; text-decoration: none; border: 1px solid var(--border); }
    .btn:hover { border-color: var(--primary); color: var(--primary); }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <a href="/" style="display: flex; align-items: center; gap: 0.5rem; color: var(--text); text-decoration: none; font-weight: 800; font-size: 1.1rem;">
        ${
          appIconUrl
            ? `<img src="${appIconUrl}" alt="${appName}" style="width: 1.75rem; height: 1.75rem; border-radius: 0.5rem; object-fit: cover;">`
            : `<i class="fa-solid fa-rss" style="color: var(--primary);"></i>`
        } ${appName}
      </a>
      <div style="display: flex; gap: 0.5rem;">
        <a href="/" class="btn"><i class="fa-solid fa-house"></i> Home</a>
        <a href="/dashboard" class="btn"><i class="fa-solid fa-gauge"></i> Dashboard</a>
      </div>
    </div>
    <div>${contentHtml}</div>
  </div>
</body>
</html>`;
}
