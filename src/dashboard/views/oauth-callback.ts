export function renderOAuthCallbackHtml(
  status: 'success' | 'error',
  provider: string,
  errorDetail?: string,
  appName = 'HELIX RSS',
  appIconUrl?: string | null,
): string {
  const isSuccess = status === 'success';
  const icon = isSuccess ? 'fa-circle-check' : 'fa-circle-xmark';
  const iconColor = isSuccess ? '#10b981' : '#ef4444';
  const title = isSuccess ? 'Connection Successful' : 'Connection Failed';
  const msg = isSuccess
    ? `Successfully connected ${provider}. You can return to the dashboard.`
    : errorDetail || `Failed to authenticate with ${provider}.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} · ${appName}</title>
  ${appIconUrl ? `<link rel="icon" type="image/png" href="${appIconUrl}">` : ''}
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0b0f19; color: #f3f4f6; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .card { background: #111827; border: 1px solid #1f2937; border-radius: 1.25rem; padding: 2.25rem; max-width: 440px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .icon { font-size: 3rem; color: ${iconColor}; margin-bottom: 1rem; }
    h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
    p { font-size: 0.875rem; color: #9ca3af; margin-bottom: 1.5rem; line-height: 1.5; }
    .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem; border-radius: 0.75rem; background: #06b6d4; color: #fff; font-size: 0.875rem; font-weight: 600; text-decoration: none; }
    .btn:hover { background: #0891b2; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon"><i class="fa-solid ${icon}"></i></div>
    <h1>${title}</h1>
    <p>${msg}</p>
    <a href="/dashboard" class="btn"><i class="fa-solid fa-arrow-left"></i> Return to Dashboard</a>
  </div>
</body>
</html>`;
}

export const renderOAuthErrorHtml = (
  title: string,
  message: string,
  appName = 'HELIX RSS',
  appIconUrl?: string | null,
): string => renderOAuthCallbackHtml('error', title, message, appName, appIconUrl);
