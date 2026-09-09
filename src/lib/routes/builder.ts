import type { AppDeps } from '../../app.js';
import { analyzeUrl, analyzeScrapeUrl } from '../../feed/builder.js';
import type { ScrapeSelectors } from '../../feed/scraper.js';
import { readBodyJson, sendError, sendJson } from '../../http/helpers.js';
import type { Router } from '../../http/router.js';
import { requireUser } from './shared.js';

export function registerBuilderRoutes(router: Router<AppDeps>): void {
  router.add('POST', '/api/builder/analyze', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    const body = (await readBodyJson(req)) as { url?: string };
    const url = body.url?.trim();
    if (!url) return sendError(res, 400, 'url is required');
    try {
      const analysis = await analyzeUrl(url);
      d.repo.logActivity(userId, 'info', 'builder', `Analyzed ${url}`);
      sendJson(res, 200, analysis);
    } catch (err) {
      sendError(res, 500, err instanceof Error ? err.message : 'Analysis failed');
    }
  });

  router.add('POST', '/api/builder/scrape-test', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    const body = (await readBodyJson(req)) as { url?: string; selectors?: ScrapeSelectors };
    const url = body.url?.trim();
    const sel = body.selectors;
    if (!url || !sel?.itemSelector || !sel.titleSelector || !sel.linkSelector) {
      return sendError(res, 400, 'url, itemSelector, titleSelector, and linkSelector are required');
    }
    try {
      const sample = await analyzeScrapeUrl(url, sel);
      sendJson(res, 200, sample);
    } catch (err) {
      sendError(res, 500, err instanceof Error ? err.message : 'Scrape test failed');
    }
  });
}
