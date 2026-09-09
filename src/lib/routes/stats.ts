import type { AppDeps } from '../../app.js';
import { sendJson } from '../../http/helpers.js';
import type { Router } from '../../http/router.js';
import { requireUser } from './shared.js';

export function registerStatsRoutes(router: Router<AppDeps>): void {
  router.add('GET', '/api/stats', async (req, res, _ctx, d) => {
    const userId = await requireUser(req, res, d);
    if (userId === null) return;
    const dbStats = d.db.stats();
    sendJson(res, 200, {
      ...dbStats,
      myFeeds: d.repo.listFeeds(userId).length,
      myWebhooks: d.repo.listWebhooks(userId).length,
      myMonitors: d.repo.listMonitors(userId).length,
      activity: d.repo.recentActivity(12).map((a) => ({
        ts: a.ts,
        level: a.level,
        source: a.source,
        message: a.message,
      })),
    });
  });
}
