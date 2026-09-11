export function renderLoginHtml(isRegister: boolean): string {
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
<body class="min-h-screen flex items-center justify-center font-sans p-4 selection:bg-cyan-500 selection:text-white">
  <div class="w-full max-w-md">
    <div class="text-center mb-6">
      <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 shadow-lg shadow-cyan-500/30 mb-3 border border-cyan-400/20">
        <i class="fa-solid fa-rss text-white text-xl"></i>
      </div>
      <h1 class="text-2xl font-extrabold tracking-tight text-white">HELIX <span class="text-cyan-400">RSS</span></h1>
      <p class="text-xs text-gray-400 mt-1">Self-hosted RSS &amp; status monitoring for Discord communities</p>
    </div>

    <div class="glass rounded-2xl p-6 space-y-5 shadow-2xl border border-gray-800">
      <div class="text-center space-y-1">
        <h2 class="text-base font-bold text-white">${title}</h2>
        <p class="text-xs text-gray-400">Sign in with Discord to access your dashboard</p>
      </div>

      <div id="error-box" class="hidden p-3 rounded-xl text-xs font-mono bg-red-950/60 text-red-300 border border-red-800"></div>

      <!-- Primary Discord Login Action -->
      <div class="space-y-3">
        <a href="/api/auth/discord" id="discord-login-btn" class="w-full py-3 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-sm transition flex items-center justify-center gap-2.5 shadow-lg shadow-[#5865F2]/25 group">
          <i class="fa-brands fa-discord text-lg group-hover:scale-110 transition-transform"></i> Continue with Discord
        </a>
      </div>

      <!-- Divider -->
      <div class="relative flex items-center justify-center">
        <div class="border-t border-gray-800 w-full"></div>
        <button onclick="togglePasswordForm()" type="button" class="bg-gray-900 px-3 text-[11px] text-gray-500 uppercase tracking-wider hover:text-gray-400 transition shrink-0">
          or use email &amp; password <i id="toggle-icon" class="fa-solid fa-chevron-down ml-1 text-[10px]"></i>
        </button>
      </div>

      <!-- Secondary Email/Password Form -->
      <div id="password-form-container" class="hidden space-y-3 pt-1">
        <div>
          <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Email</label>
          <input type="email" id="email" placeholder="you@example.com" autocomplete="email" class="w-full bg-black/40 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono">
        </div>
        ${
          isRegister
            ? `
        <div>
          <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Display Name (optional)</label>
          <input type="text" id="display-name" placeholder="Your Name" autocomplete="name" class="w-full bg-black/40 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500">
        </div>`
            : ''
        }
        <div>
          <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Password</label>
          <input type="password" id="password" placeholder="••••••••" autocomplete="${isRegister ? 'new-password' : 'current-password'}" class="w-full bg-black/40 border border-gray-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono">
        </div>

        <button onclick="${isRegister ? 'submitRegister()' : 'submitLogin()'}" id="submit-btn" class="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white font-semibold text-xs transition border border-gray-700 flex items-center justify-center gap-2">
          <i class="fa-solid fa-right-to-bracket"></i> ${title} with Password
        </button>
      </div>

      <div class="pt-2 text-center text-xs text-gray-400">
        <a href="/" class="text-cyan-400 hover:underline inline-flex items-center gap-1.5">
          <i class="fa-solid fa-arrow-left text-[10px]"></i> Return to Dashboard
        </a>
      </div>
    </div>

    <p class="text-center text-[11px] text-gray-600 mt-6">
      Self-hosted feed monitoring · SQLite · Zero runtime dependencies
    </p>
  </div>

  <script>
    function togglePasswordForm() {
      const form = document.getElementById('password-form-container');
      const icon = document.getElementById('toggle-icon');
      if (form.classList.contains('hidden')) {
        form.classList.remove('hidden');
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
      } else {
        form.classList.add('hidden');
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
      }
    }

    async function submitLogin() {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const btn = document.getElementById('submit-btn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok && data.user) {
          window.location.href = '/';
        } else {
          showError(data.error || 'Login failed');
        }
      } catch (err) {
        showError('Network error: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Log In with Password';
      }
    }

    async function submitRegister() {
      const email = document.getElementById('email').value.trim();
      const displayName = document.getElementById('display-name').value.trim();
      const password = document.getElementById('password').value;
      const btn = document.getElementById('submit-btn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, displayName })
        });
        const data = await res.json();
        if (res.ok && data.user) {
          window.location.href = '/';
        } else {
          showError(data.error || 'Registration failed');
        }
      } catch (err) {
        showError('Network error: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Create Account with Password';
      }
    }

    function showError(message) {
      const box = document.getElementById('error-box');
      box.textContent = '✖ ' + message;
      box.classList.remove('hidden');
    }

    const urlError = new URLSearchParams(window.location.search).get('error');
    if (urlError) {
      showError(urlError);
    }
  </script>
</body>
</html>`;
}
