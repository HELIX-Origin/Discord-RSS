# Web Basics Skill

## Fundamentals
- All monitoring is based on public HTTP/HTTPS endpoints.
- `urllib.request.urlopen()` follows redirects (`http.client.HTTPResponse.status` check optional).
- Status checks use a simple `HEAD` or `GET` request with a 10-second timeout; a `200` means online, anything else or an exception means offline.

## Filtering
- URLs containing `/admin/`, `/mod/`, `/staff/`, `/login`, `/register` must be excluded from feed ingestion.
- Only links starting with `SITE_URL` (or matching its domain) are included.
