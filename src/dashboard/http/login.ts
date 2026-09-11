export function renderLoginHtml(isRegister: boolean, botInviteUrl?: string | null): string {
  const title = isRegister ? 'Create Account' : 'Log In';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} · HELIX RSS</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body { background-color: #0b0f19; color: #f3f4f6; }
    .glass { background: rgba(17, 24, 39, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(55, 65, 81, 0.5); }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between font-sans p-4 selection:bg-cyan-500 selection:text-white">
  <!-- Top Navigation / Bot Invite Bar -->
  <header class="w-full max-w-4xl mx-auto flex items-center justify-between py-2 px-4">
    <a href="/" class="flex items-center gap-2.5 group">
      <div class="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
        <i class="fa-solid fa-rss text-sm"></i>
      </div>
      <span class="font-extrabold text-white text-base tracking-tight">HELIX <span class="text-cyan-400">RSS</span></span>
    </a>

    ${
      botInviteUrl
        ? `<a href="${botInviteUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#5865F2] hover:bg-[#4752C4] text-white transition shadow-sm shadow-[#5865F2]/25">
      <i class="fa-brands fa-discord text-sm"></i> Invite Bot to Server
    </a>`
        : ''
    }
  </header>

  <div class="w-full max-w-md mx-auto my-auto py-8">
    <div class="text-center mb-6">
      <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 shadow-lg shadow-cyan-500/30 mb-3 border border-cyan-400/20">
        <i class="fa-solid fa-rss text-white text-xl"></i>
      </div>
      <h1 class="text-2xl font-extrabold tracking-tight text-white">HELIX <span class="text-cyan-400">RSS</span></h1>
      <p class="text-xs text-gray-400 mt-1">Self-hosted RSS &amp; status monitoring for Discord communities</p>
    </div>

    ${
      botInviteUrl
        ? `<div class="mb-5 p-4 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/30 flex items-center justify-between gap-3 text-left">
      <div>
        <div class="text-xs font-bold text-white flex items-center gap-1.5">
          <i class="fa-brands fa-discord text-[#5865F2]"></i> Add Bot to Server
        </div>
        <p class="text-[11px] text-gray-400 mt-0.5">Need feeds in your Discord? Invite the bot to your channels first.</p>
      </div>
      <a href="${botInviteUrl}" target="_blank" rel="noopener noreferrer" class="shrink-0 px-3 py-1.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold text-xs transition shadow-sm shadow-[#5865F2]/25">
        Invite Bot
      </a>
    </div>`
        : ''
    }

    <div class="glass rounded-2xl p-6 space-y-5 shadow-2xl border border-gray-800 text-center">
      <div class="space-y-1">
        <h2 class="text-base font-bold text-white">${title}</h2>
        <p class="text-xs text-gray-400">Sign in with Discord to access your feeds and dashboard</p>
      </div>

      <div id="error-box" class="hidden p-3 rounded-xl text-xs font-mono bg-red-950/60 text-red-300 border border-red-800 text-left"></div>

      <!-- Primary Discord Login Action -->
      <div class="space-y-3 pt-2">
        <a href="/api/auth/discord" id="discord-login-btn" class="w-full py-3.5 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-sm transition flex items-center justify-center gap-2.5 shadow-lg shadow-[#5865F2]/25 group">
          <i class="fa-brands fa-discord text-xl group-hover:scale-110 transition-transform"></i> Continue with Discord
        </a>
      </div>

      <div class="pt-2 text-xs text-gray-500 space-y-2">
        <p>Your account is created automatically upon your first Discord sign-in.</p>
        <div>
          <a href="/" class="text-cyan-400 hover:underline inline-flex items-center gap-1.5 text-xs">
            <i class="fa-solid fa-arrow-left text-[10px]"></i> Return to Dashboard
          </a>
        </div>
      </div>
    </div>

    <p class="text-center text-[11px] text-gray-600 mt-6">
      Self-hosted feed monitoring · SQLite · Zero runtime dependencies
    </p>
  </div>

  <footer class="w-full text-center py-4 text-xs text-gray-600">
    HELIX RSS &copy; 2026
  </footer>

  <script>
    const urlError = new URLSearchParams(window.location.search).get('error');
    if (urlError) {
      const box = document.getElementById('error-box');
      box.textContent = '✖ ' + urlError;
      box.classList.remove('hidden');
    }
  </script>
</body>
</html>`;
}
