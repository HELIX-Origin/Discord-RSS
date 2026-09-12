import type { AppDeps } from '../../app.js';
import type { FeedType } from '../../state/types.js';
import { readBodyJson, sendError, sendJson } from '../http/helpers.js';
import type { Router } from '../http/router.js';
import { requireAdminOrOwner } from './shared.js';

export function registerSettingsRoutes(router: Router<AppDeps>): void {
  router.add('GET', '/api/settings', async (req, res, _ctx, d) => {
    const userId = await requireAdminOrOwner(req, res, d);
    if (userId === null) return;
    const savedPollInterval = d.repo.getSetting('poll_interval_ms');
    const pollIntervalMs = savedPollInterval ? Number(savedPollInterval) : d.config.pollIntervalMs;
    sendJson(res, 200, {
      oauthProviders: d.oauth.listProviders(),
      publicBaseUrl: d.repo.getSetting('public_base_url') ?? d.config.publicBaseUrl,
      pollIntervalMs: Number.isInteger(pollIntervalMs) && pollIntervalMs > 0 ? pollIntervalMs : 3_600_000,
    });
  });

  router.add('POST', '/api/settings', async (req, res, _ctx, d) => {
    const userId = await requireAdminOrOwner(req, res, d);
    if (userId === null) return;
    const body = (await readBodyJson(req)) as { publicBaseUrl?: string; pollIntervalMs?: number };
    if (body.publicBaseUrl !== undefined) {
      d.repo.setSetting('public_base_url', body.publicBaseUrl);
    }
    if (body.pollIntervalMs !== undefined) {
      const allowed = [60_000, 600_000, 1_800_000, 3_600_000];
      if (!allowed.includes(body.pollIntervalMs)) {
        sendError(
          res,
          400,
          'Invalid poll interval. Allowed intervals are: 1m (60000), 10m (600000), 30m (1800000), 1h (3600000)',
        );
        return;
      }
      d.repo.setSetting('poll_interval_ms', String(body.pollIntervalMs));
      d.scheduler?.reschedule('feed-poll', body.pollIntervalMs);
    }
    sendJson(res, 200, { ok: true });
  });

  router.add('POST', '/api/settings/oauth/:provider', async (req, res) => {
    sendError(
      res,
      400,
      'OAuth provider credentials cannot be configured via the dashboard. Please configure DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in your .env file.',
    );
  });

  // ---- User & Member Management ----
  router.add('GET', '/api/settings/users', async (req, res, _ctx, d) => {
    const userId = await requireAdminOrOwner(req, res, d);
    if (userId === null) return;

    const allFeeds = d.repo.listFeedsForAllUsers();
    const users = d.repo.listUsers().map((u) => {
      const userFeeds = allFeeds.filter((f) => f.userId === u.id);
      const feedsWithIssuesCount = userFeeds.filter(
        (f) => !f.channelId || f.enabled === 0 || f.lastCheckedAt === null,
      ).length;

      return {
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        feedCount: userFeeds.length,
        feedsWithIssuesCount,
        createdAt: u.createdAt,
      };
    });
    sendJson(res, 200, users);
  });

  router.add('GET', '/api/settings/users/:id/feeds', async (req, res, ctx, d) => {
    const adminId = await requireAdminOrOwner(req, res, d);
    if (adminId === null) return;
    const targetUserId = Number(ctx.params['id']);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      sendError(res, 400, 'Invalid user ID');
      return;
    }
    const targetUser = d.repo.getUserById(targetUserId);
    if (!targetUser) {
      sendError(res, 404, 'User not found');
      return;
    }
    const feeds = d.repo.listFeeds(targetUserId);

    const feedDiagnostics = feeds.map((f) => {
      const issues: string[] = [];
      if (!f.channelId) {
        issues.push('No Discord channel configured (entries will not be posted)');
      }
      if (!f.enabled) {
        issues.push('Feed is currently paused');
      }
      if (f.enabled && !f.lastCheckedAt) {
        issues.push('Feed has never been checked');
      }

      return {
        ...f,
        channelName: f.channelId ? `<#${f.channelId}>` : null,
        issues,
      };
    });

    sendJson(res, 200, {
      user: {
        id: targetUser.id,
        email: targetUser.email,
        displayName: targetUser.displayName,
        role: targetUser.role,
      },
      feeds: feedDiagnostics,
    });
  });

  router.add('PATCH', '/api/settings/users/:id/role', async (req, res, _ctx, d) => {
    const adminId = await requireAdminOrOwner(req, res, d);
    if (adminId === null) return;
    sendError(
      res,
      400,
      'Manual role assignment is not supported. Application team permissions are managed directly in the Discord Developer Portal.',
    );
  });

  // ---- Member Feed Health & Diagnostics ----
  router.add('GET', '/api/settings/diagnostics/feeds', async (req, res, _ctx, d) => {
    const adminId = await requireAdminOrOwner(req, res, d);
    if (adminId === null) return;

    const allFeeds = d.repo.listFeedsForAllUsers();
    const users = d.repo.listUsers();
    const userMap = new Map(users.map((u) => [u.id, u]));

    const { isValidHttpUrl } = await import('./shared.js');

    const issues: Array<{
      feedId: number;
      feedName: string;
      feedUrl: string;
      feedType: FeedType;
      userId: number;
      userEmail: string;
      userDisplayName: string;
      channelId: string | null;
      channelName: string | null;
      enabled: boolean;
      lastCheckedAt: string | null;
      problems: Array<{
        type: string;
        severity: 'error' | 'warning' | 'info';
        title: string;
        description: string;
        recommendation: string;
      }>;
    }> = [];

    let missingChannelCount = 0;
    let disabledFeedCount = 0;
    let staleCount = 0;

    for (const feed of allFeeds) {
      const feedProblems: (typeof issues)[0]['problems'] = [];
      const user = userMap.get(feed.userId);
      const userEmail = user ? user.email : `User #${feed.userId}`;
      const userDisplayName = user ? user.displayName : `User #${feed.userId}`;

      const destinationName: string | null = feed.channelId ? `<#${feed.channelId}>` : null;
      if (!feed.channelId) {
        missingChannelCount += 1;
        feedProblems.push({
          type: 'missing_destination',
          severity: 'error',
          title: 'No Discord Channel Configured',
          description: 'This feed has no Discord channel selected. New feed entries will not be delivered.',
          recommendation: 'Select a target Discord channel for this feed so entries can be posted.',
        });
      }

      if (!feed.enabled) {
        disabledFeedCount += 1;
        feedProblems.push({
          type: 'disabled_feed',
          severity: 'info',
          title: 'Feed is Paused',
          description: 'This feed is currently disabled / paused and is skipped during scheduled polling.',
          recommendation: 'Resume the feed when the member is ready to receive updates.',
        });
      }

      const isFreeGamesUrl = feed.url.startsWith('freegames://');
      if (!isValidHttpUrl(feed.url) && !isFreeGamesUrl) {
        feedProblems.push({
          type: 'invalid_url',
          severity: 'error',
          title: 'Invalid Feed URL',
          description: 'The feed URL is not a valid HTTP or HTTPS address.',
          recommendation: 'Verify the protocol and domain name format of the feed URL.',
        });
      } else if (feed.enabled && !feed.lastCheckedAt) {
        staleCount += 1;
        feedProblems.push({
          type: 'never_polled',
          severity: 'warning',
          title: 'Never Polled',
          description: 'This feed has not yet been polled by the background scheduler.',
          recommendation: 'Trigger a manual poll or verify the background polling interval.',
        });
      }

      if (feedProblems.length > 0) {
        issues.push({
          feedId: feed.id,
          feedName: feed.name,
          feedUrl: feed.url,
          feedType: feed.feedType,
          userId: feed.userId,
          userEmail,
          userDisplayName,
          channelId: feed.channelId,
          channelName: destinationName,
          enabled: Boolean(feed.enabled),
          lastCheckedAt: feed.lastCheckedAt,
          problems: feedProblems,
        });
      }
    }

    sendJson(res, 200, {
      totalFeeds: allFeeds.length,
      issuesCount: issues.length,
      healthyFeedsCount: allFeeds.length - issues.length,
      stats: {
        missingWebhookCount: missingChannelCount,
        missingChannelCount,
        disabledFeedCount,
        staleCount,
      },
      feedsWithIssues: issues,
      allFeeds: allFeeds.map((f) => ({
        id: f.id,
        name: f.name,
        url: f.url,
        feedType: f.feedType,
        userId: f.userId,
        userEmail: userMap.get(f.userId)?.email ?? `User #${f.userId}`,
        enabled: Boolean(f.enabled),
        channelId: f.channelId,
        lastCheckedAt: f.lastCheckedAt,
      })),
    });
  });

  router.add('POST', '/api/settings/diagnostics/feed-check', async (req, res, _ctx, d) => {
    const adminId = await requireAdminOrOwner(req, res, d);
    if (adminId === null) return;

    const body = (await readBodyJson(req)) as {
      url?: string;
      feedType?: 'rss' | 'scrape';
      scrape?: { item?: string; title?: string; link?: string; description?: string };
    };

    const url = body.url?.trim();
    if (!url) {
      sendError(res, 400, 'Feed URL is required');
      return;
    }

    const { fetchRaw, isFeedXml } = await import('../../feed/fetch.js');
    const { parseFeed } = await import('../../feed/parser.js');
    const { parseHtml } = await import('../../feed/html.js');
    const { scrapeItems } = await import('../../feed/scraper.js');

    const recommendations: string[] = [];

    try {
      const fetchRes = await fetchRaw(url, { timeoutMs: d.config.requestTimeoutMs });

      let entriesCount = 0;
      let feedTitle = '';
      let latestEntry: { title?: string; link?: string; publishedAt?: string } | null = null;
      let parseError: string | null = null;

      if (fetchRes.challenged) {
        recommendations.push(
          'Cloudflare Anti-Bot Challenge detected. The target site blocks automated crawler requests.',
        );
      }

      if (fetchRes.status !== 200) {
        recommendations.push(`HTTP Server returned status ${fetchRes.status}. Check if the endpoint is online.`);
      }

      const isXml = isFeedXml(fetchRes);

      if (body.feedType === 'scrape' && body.scrape?.item) {
        try {
          const parsedHtml = parseHtml(fetchRes.text);
          const scraped = scrapeItems(parsedHtml, {
            itemSelector: body.scrape.item,
            titleSelector: body.scrape.title || 'a',
            linkSelector: body.scrape.link || 'a',
            descriptionSelector: body.scrape.description,
          });
          entriesCount = scraped.length;
          if (scraped[0]) {
            latestEntry = {
              title: scraped[0].title,
              link: scraped[0].url,
              publishedAt: undefined,
            };
          }
          if (entriesCount === 0) {
            recommendations.push('Scrape selectors did not match any items in the HTML document.');
          } else {
            recommendations.push(`Scraper matched ${entriesCount} items successfully.`);
          }
        } catch (err) {
          parseError = err instanceof Error ? err.message : String(err);
          recommendations.push(`HTML Scraper parsing failed: ${parseError}`);
        }
      } else if (isXml) {
        try {
          const parsed = parseFeed(fetchRes.text);
          entriesCount = parsed.entries.length;
          feedTitle = parsed.title;
          if (parsed.entries[0]) {
            latestEntry = {
              title: parsed.entries[0].title,
              link: parsed.entries[0].link,
              publishedAt: parsed.entries[0].publishedAt ?? undefined,
            };
          }
          if (entriesCount === 0) {
            recommendations.push('Feed XML was parsed, but contains 0 items or articles.');
          } else {
            recommendations.push(`Feed parsed successfully (${entriesCount} articles available).`);
          }
        } catch (err) {
          parseError = err instanceof Error ? err.message : String(err);
          recommendations.push(`Feed XML parsing failed: ${parseError}`);
        }
      } else {
        recommendations.push(
          'This URL does not appear to be standard RSS/Atom XML. Verify the RSS feed URL or use a custom webpage scraper feed.',
        );
      }

      sendJson(res, 200, {
        ok: fetchRes.status >= 200 && fetchRes.status < 300 && !parseError,
        url: fetchRes.url,
        httpStatus: fetchRes.status,
        durationMs: fetchRes.durationMs,
        contentType: fetchRes.contentType,
        isCloudflare: fetchRes.challenged,
        isFeedXml: isXml,
        feedTitle,
        entriesCount,
        latestEntry,
        parseError,
        recommendations,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      sendJson(res, 200, {
        ok: false,
        url,
        httpStatus: null,
        durationMs: null,
        contentType: null,
        isCloudflare: false,
        isFeedXml: false,
        feedTitle: '',
        entriesCount: 0,
        latestEntry: null,
        parseError: msg,
        recommendations: [`Network request failed: ${msg}. Check feed URL accessibility.`],
      });
    }
  });
}
