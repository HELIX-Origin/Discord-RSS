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
  <title>${title} · Discord RSS</title>
  <script src="https://cdn.tailwindcss.com"></script>
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
