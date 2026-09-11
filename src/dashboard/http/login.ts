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
  <script>
    (function() {
      try {
        const saved = localStorage.getItem('helix-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (saved === 'light' || (!saved && !prefersDark)) {
          document.documentElement.classList.add('light-theme');
        } else {
          document.documentElement.classList.remove('light-theme');
        }
      } catch (e) {}
    })();
  </script>
  <style>
    :root {
      --bg-main: #0b0f19;
      --bg-glass: rgba(17, 24, 39, 0.75);
      --border-glass: rgba(55, 65, 81, 0.5);
      --text-main: #f3f4f6;
    }
    html.light-theme {
      --bg-main: #e8ecf2;
      --bg-glass: rgba(248, 250, 252, 0.9);
      --border-glass: rgba(203, 213, 225, 0.9);
      --text-main: #1e293b;
    }
    body { background-color: var(--bg-main); color: var(--text-main); transition: background-color 0.2s ease, color 0.2s ease; }
    .glass { background: var(--bg-glass); backdrop-filter: blur(12px); border: 1px solid var(--border-glass); }

    html.light-theme .text-white { color: #1e293b !important; }
    html.light-theme .text-gray-400 { color: #475569 !important; }
    html.light-theme .text-gray-500 { color: #64748b !important; }
    html.light-theme .bg-gray-900 { background-color: #f8fafc !important; color: #1e293b !important; border-color: #cbd5e1 !important; }
    html.light-theme .bg-gray-800 { background-color: #edf1f7 !important; color: #1e293b !important; border-color: #cbd5e1 !important; }
    html.light-theme .border-gray-800 { border-color: #cbd5e1 !important; }
    html.light-theme .border-gray-700 { border-color: #cbd5e1 !important; }
    html.light-theme input { background-color: #ffffff !important; color: #1e293b !important; border-color: #cbd5e1 !important; }
    html.light-theme input::placeholder { color: #94a3b8 !important; }
    html.light-theme #theme-toggle-btn { background-color: #edf1f7 !important; color: #334155 !important; border-color: #cbd5e1 !important; }
    html.light-theme #theme-toggle-btn:hover { background-color: #dfe4ec !important; color: #0f172a !important; }
    html.light-theme .shadow-2xl { box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04) !important; }
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

    <div class="flex items-center gap-3">
      <button id="theme-toggle-btn" onclick="toggleTheme()" title="Toggle Light/Dark Theme" class="inline-flex items-center justify-center h-8 w-8 rounded-xl text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition border border-gray-700">
        <i id="theme-toggle-icon" class="fa-solid fa-moon text-cyan-400"></i>
      </button>
      ${
        botInviteUrl
          ? `<a href="${botInviteUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#5865F2] hover:bg-[#4752C4] text-white transition shadow-sm shadow-[#5865F2]/25">
        <i class="fa-brands fa-discord text-sm"></i> Invite Bot to Server
      </a>`
          : ''
      }
    </div>
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

      <div class="relative flex py-1 items-center">
        <div class="flex-grow border-t border-gray-700/50"></div>
        <span class="flex-shrink mx-3 text-gray-500 text-[11px] uppercase tracking-wider font-semibold">or with credentials</span>
        <div class="flex-grow border-t border-gray-700/50"></div>
      </div>

      <!-- Local Account Form (Fallback if Discord OAuth is blocked or unconfigured) -->
      <form id="credentials-form" class="space-y-3 text-left" onsubmit="handleCredentialsAuth(event)">
        ${
          isRegister
            ? `<div>
          <label class="block text-xs font-medium text-gray-300 mb-1" for="cred-name">Display Name</label>
          <input type="text" id="cred-name" placeholder="Admin" class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition">
        </div>`
            : ''
        }
        <div>
          <label class="block text-xs font-medium text-gray-300 mb-1" for="cred-email">Email Address</label>
          <input type="email" id="cred-email" required placeholder="admin@example.com" class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-300 mb-1" for="cred-password">Password</label>
          <input type="password" id="cred-password" required minlength="8" placeholder="••••••••" class="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition">
        </div>
        <button type="submit" id="cred-submit-btn" class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs transition shadow-md shadow-cyan-500/20">
          ${isRegister ? 'Create Local Account' : 'Sign In with Password'}
        </button>
      </form>

      <div class="pt-1 text-xs text-gray-500 space-y-2">
        ${
          isRegister
            ? `<p>Already have an account? <a href="/login" class="text-cyan-400 hover:underline font-medium">Log in</a></p>`
            : `<p>First time self-hosting? <a href="/register" class="text-cyan-400 hover:underline font-medium">Create local admin account</a></p>`
        }
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

  <footer class="w-full text-center py-4 text-xs text-gray-600 space-x-3">
    <span>HELIX RSS &copy; 2026</span>
    <span>&middot;</span>
    <a href="/privacy" class="hover:text-gray-400 transition">Privacy Policy</a>
    <span>&middot;</span>
    <a href="/tos" class="hover:text-gray-400 transition">Terms of Service</a>
  </footer>

  <script>
    const urlError = new URLSearchParams(window.location.search).get('error');
    if (urlError) {
      const box = document.getElementById('error-box');
      box.textContent = '✖ ' + urlError;
      box.classList.remove('hidden');
    }

    async function handleCredentialsAuth(event) {
      event.preventDefault();
      const box = document.getElementById('error-box');
      const submitBtn = document.getElementById('cred-submit-btn');
      box.classList.add('hidden');
      
      const email = document.getElementById('cred-email').value;
      const password = document.getElementById('cred-password').value;
      const nameInput = document.getElementById('cred-name');
      const displayName = nameInput ? nameInput.value : undefined;

      const endpoint = ${isRegister ? "'/api/auth/register'" : "'/api/auth/login'"};
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating...';

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, displayName }),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || 'Authentication failed (HTTP ' + res.status + ')');
        }

        window.location.href = '/';
      } catch (err) {
        box.textContent = '✖ ' + err.message;
        box.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }

    function initTheme() {
      const isLight = document.documentElement.classList.contains('light-theme');
      updateThemeIcon(isLight);
      try {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (!localStorage.getItem('helix-theme')) {
            if (e.matches) {
              document.documentElement.classList.remove('light-theme');
              updateThemeIcon(false);
            } else {
              document.documentElement.classList.add('light-theme');
              updateThemeIcon(true);
            }
          }
        });
      } catch {}
    }

    function toggleTheme() {
      const isLight = document.documentElement.classList.toggle('light-theme');
      try {
        localStorage.setItem('helix-theme', isLight ? 'light' : 'dark');
      } catch {}
      updateThemeIcon(isLight);
    }

    function updateThemeIcon(isLight) {
      const icon = document.getElementById('theme-toggle-icon');
      if (icon) {
        icon.className = isLight ? 'fa-solid fa-sun text-amber-500' : 'fa-solid fa-moon text-cyan-400';
      }
    }

    initTheme();
  </script>
</body>
</html>`;
}
