import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function renderMarkdownToHtml(markdown: string): string {
  // Convert basic markdown elements to HTML
  const lines = markdown.split('\n');
  const out: string[] = [];
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-cyan-400 hover:underline">$1</a>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
      .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-gray-800 text-cyan-300 font-mono text-xs">$1</code>');

    if (line.startsWith('# ')) {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      out.push(`<h1 class="text-2xl font-bold text-white mb-4 mt-6">${line.slice(2)}</h1>`);
    } else if (line.startsWith('## ')) {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      out.push(
        `<h2 class="text-xl font-bold text-white mb-3 mt-6 pb-1 border-b border-gray-800">${line.slice(3)}</h2>`,
      );
    } else if (line.startsWith('### ')) {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      out.push(`<h3 class="text-base font-semibold text-cyan-300 mb-2 mt-4">${line.slice(4)}</h3>`);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        out.push('<ul class="list-disc pl-5 space-y-1.5 text-sm text-gray-300 mb-4">');
        inList = true;
      }
      out.push(`<li>${line.slice(2)}</li>`);
    } else if (line.trim() === '---') {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      out.push('<hr class="border-gray-800 my-6">');
    } else if (line.trim() === '') {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
    } else {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      out.push(`<p class="text-sm text-gray-300 leading-relaxed mb-3">${line}</p>`);
    }
  }

  if (inList) {
    out.push('</ul>');
  }

  return out.join('\n');
}

export function renderLegalHtml(title: string, markdownFilename: string): string {
  const filePath = resolve(process.cwd(), markdownFilename);
  const content = existsSync(filePath)
    ? readFileSync(filePath, 'utf8')
    : `# ${title}\n\nDocument not found. Please refer to the repository.`;

  const bodyHtml = renderMarkdownToHtml(content);

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - HELIX RSS</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body {
      background-color: #0d1117;
      color: #c9d1d9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    }
    .glass {
      background: rgba(22, 27, 34, 0.85);
      backdrop-filter: blur(12px);
    }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
  <div class="max-w-4xl mx-auto w-full">
    <div class="flex items-center justify-between mb-8 pb-4 border-b border-gray-800">
      <div class="flex items-center gap-3">
        <a href="/" class="flex items-center gap-2 text-white hover:text-cyan-400 transition font-bold text-lg">
          <i class="fa-solid fa-rss text-cyan-400"></i> HELIX RSS
        </a>
      </div>
      <div class="flex items-center gap-3">
        <a href="/login" class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 transition border border-gray-700">
          <i class="fa-solid fa-right-to-bracket mr-1.5"></i> Login
        </a>
        <a href="/dashboard" class="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition">
          <i class="fa-solid fa-gauge mr-1.5"></i> Dashboard
        </a>
      </div>
    </div>

    <main class="glass p-8 sm:p-10 rounded-2xl border border-gray-800 shadow-2xl">
      ${bodyHtml}
    </main>

    <footer class="mt-12 text-center text-xs text-gray-500 border-t border-gray-800 pt-6">
      <div class="flex justify-center gap-6 mb-3">
        <a href="/privacy" class="hover:text-gray-400 transition">Privacy Policy</a>
        <a href="/tos" class="hover:text-gray-400 transition">Terms of Service</a>
        <a href="https://github.com/HELIX-Origin/HELIX-RSS" target="_blank" rel="noreferrer" class="hover:text-gray-400 transition">GitHub</a>
      </div>
      <p>&copy; ${new Date().getFullYear()} HELIX RSS. Open-source self-hosted service.</p>
    </footer>
  </div>
</body>
</html>`;
}
