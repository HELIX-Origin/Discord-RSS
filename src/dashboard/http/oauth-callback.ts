import { escapeHtml } from './helpers.js';

export function renderOAuthCallbackHtml(status: 'success' | 'error', provider: string, errorMessage?: string): string {
  const isSuccess = status === 'success';
  const safeProvider = escapeHtml(provider);
  const title = isSuccess ? `Connected ${safeProvider}` : 'Connection Failed';
  const message = isSuccess
    ? `You have successfully connected ${safeProvider}. You can close this window and return to the dashboard.`
    : escapeHtml(errorMessage ?? `Failed to connect ${safeProvider}. Please try again.`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} · HELIX RSS</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="min-h-screen flex items-center justify-center font-sans" style="background-color:#0b0f19;color:#f3f4f6;">
  <div class="text-center max-w-md px-6">
    <div class="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-4
      ${isSuccess ? 'bg-green-900/60 border border-green-700' : 'bg-red-900/60 border border-red-700'}">
      <i class="fa-solid ${isSuccess ? 'fa-check' : 'fa-triangle-exclamation'} text-2xl ${isSuccess ? 'text-green-400' : 'text-red-400'}"></i>
    </div>
    <h1 class="text-xl font-extrabold tracking-tight text-white mb-2">${title}</h1>
    <p class="text-sm text-gray-400 leading-relaxed">${message}</p>
    <a href="/" class="inline-flex mt-6 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition shadow-lg shadow-cyan-600/20">
      <i class="fa-solid fa-arrow-left mr-2"></i> Return to Dashboard
    </a>
  </div>
</body>
</html>`;
}

export function renderOAuthErrorHtml(
  title = 'OAuth Notice',
  message = 'The requested authentication provider encountered an error or is not configured. The rest of the dashboard is up and running smoothly, so feel free to return there safely.',
): string {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} · HELIX RSS</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script>
    (function() {
      try {
        const stored = localStorage.getItem('helix-theme');
        if (stored === 'light' || (!stored && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches)) {
          document.documentElement.classList.add('light-theme');
        }
      } catch (e) {}
    })();
  </script>
  <style>
    :root {
      --bg-main: #0b0f19;
      --text-main: #f3f4f6;
    }
    html.light-theme {
      --bg-main: #e8ecf2;
      --text-main: #1e293b;
    }
    body { background-color: var(--bg-main); color: var(--text-main); transition: background-color 0.2s ease, color 0.2s ease; }
    html.light-theme .text-white { color: #1e293b !important; }
    html.light-theme .text-gray-400 { color: #475569 !important; }
    html.light-theme .bg-gray-900 { background-color: #f8fafc !important; color: #1e293b !important; border-color: #cbd5e1 !important; }
    html.light-theme .bg-gray-800 { background-color: #edf1f7 !important; color: #1e293b !important; border-color: #cbd5e1 !important; }
    html.light-theme .border-gray-800 { border-color: #cbd5e1 !important; }
    html.light-theme .border-gray-700 { border-color: #cbd5e1 !important; }
  </style>
</head>
<body class="min-h-screen flex items-center justify-center font-sans p-4">
  <div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md text-center shadow-2xl space-y-4">
    <div class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-950/60 text-amber-400 border border-amber-800 text-2xl mb-2">
      <i class="fa-solid fa-triangle-exclamation"></i>
    </div>
    <h1 class="text-xl font-extrabold tracking-tight text-white">${safeTitle}</h1>
    <p class="text-sm text-gray-400 leading-relaxed">${safeMessage}</p>
    <div class="pt-3 flex justify-center gap-3">
      <a href="/" class="inline-flex items-center px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition shadow-md shadow-cyan-600/20">
        <i class="fa-solid fa-arrow-left mr-2"></i> Return to Dashboard
      </a>
      <a href="/login" class="inline-flex items-center px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition border border-gray-700">
        <i class="fa-solid fa-right-to-bracket mr-2"></i> Login Page
      </a>
    </div>
  </div>
</body>
</html>`;
}
