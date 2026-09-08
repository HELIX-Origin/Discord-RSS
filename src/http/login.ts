export function renderLoginHtml(isRegister: boolean): string {
  const title = isRegister ? 'Create Account' : 'Log In';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} · Discord RSS</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    body { background-color: #0b0f19; color: #f3f4f6; }
    .glass { background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(55, 65, 81, 0.5); }
  </style>
</head>
<body class="min-h-screen flex items-center justify-center font-sans">
  <div class="w-full max-w-md px-4">
    <div class="text-center mb-6">
      <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 shadow-lg shadow-cyan-500/30 mb-3">
        <i class="fa-solid fa-rss text-white text-xl"></i>
      </div>
      <h1 class="text-2xl font-extrabold tracking-tight text-white">Discord <span class="text-cyan-400">RSS</span></h1>
      <p class="text-sm text-gray-400 mt-1">Post RSS &amp; Atom feeds to your Discord webhooks</p>
    </div>

    <div class="glass rounded-2xl p-6 space-y-4">
      <h2 class="text-base font-bold text-white">${title}</h2>

      <div id="error-box" class="hidden p-3 rounded-xl text-xs font-mono bg-red-950/60 text-red-300 border border-red-800"></div>

      <div class="space-y-3">
        <div>
          <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Email</label>
          <input type="email" id="email" placeholder="you@example.com" autocomplete="email" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500">
        </div>
        ${
          isRegister
            ? `
        <div>
          <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Display Name (optional)</label>
          <input type="text" id="display-name" placeholder="Your Name" autocomplete="name" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500">
        </div>`
            : ''
        }
        <div>
          <label class="block text-xs font-semibold uppercase text-gray-400 mb-1.5">Password</label>
          <input type="password" id="password" placeholder="••••••••" autocomplete="${isRegister ? 'new-password' : 'current-password'}" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500">
        </div>
      </div>

      <button onclick="${isRegister ? 'submitRegister()' : 'submitLogin()'}" id="submit-btn" class="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20">
        <i class="fa-solid fa-right-to-bracket"></i> ${title}
      </button>

      <p class="text-xs text-gray-400 text-center">
        ${
          isRegister
            ? `Already have an account? <a href="/login" class="text-cyan-400 hover:underline">Log in</a>`
            : `New here? <a href="/register" class="text-cyan-400 hover:underline">Create an account</a>`
        }
      </p>
    </div>

    <p class="text-center text-[11px] text-gray-600 mt-6">
      Self-hosted feed monitoring · SQLite · Zero runtime dependencies
    </p>
  </div>

  <script>
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
        btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Log In';
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
        btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Create Account';
      }
    }

    function showError(message) {
      const box = document.getElementById('error-box');
      box.textContent = '✖ ' + message;
      box.classList.remove('hidden');
    }
  </script>
</body>
</html>`;
}
