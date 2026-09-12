import { fetchRaw } from './fetch.js';
import { decodeHtmlEntities, stripHtml } from './parser.js';

export type FreeGamePlatformKey =
  'epic' | 'steam' | 'gog' | 'indiegala' | 'humble' | 'itchio' | 'ubisoft' | 'ea' | 'prime' | 'battlenet' | 'all';

export interface FreeGameItem {
  id: string;
  title: string;
  description: string;
  platform:
    | 'Epic Games Store'
    | 'Steam'
    | 'GOG'
    | 'IndieGala'
    | 'Humble Bundle'
    | 'Itch.io'
    | 'Ubisoft'
    | 'EA App'
    | 'Prime Gaming'
    | 'Battle.net'
    | 'PC';
  platformKey: FreeGamePlatformKey;
  url: string;
  worth: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  endDate: string | null;
  publishedAt: string | null;
}

export const PLATFORM_BRANDING: Record<string, { name: string; color: number; iconUrl: string; tag: string }> = {
  epic: {
    name: 'Epic Games Store',
    color: 0x0078f2, // Epic blue
    iconUrl: 'https://cdn2.unrealengine.com/epic-games-logo-1024x1024-1024x1024-2b9a7c36a46a.png',
    tag: 'Epic Games',
  },
  steam: {
    name: 'Steam',
    color: 0x1b2838, // Steam navy
    iconUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Steam_icon_logo.svg/200px-Steam_icon_logo.svg.png',
    tag: 'Steam',
  },
  gog: {
    name: 'GOG',
    color: 0x86328a, // GOG purple
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/GOG.com_logo.svg/200px-GOG.com_logo.svg.png',
    tag: 'GOG',
  },
  indiegala: {
    name: 'IndieGala',
    color: 0xe52534, // IndieGala red
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/IndieGala_logo.png/200px-IndieGala_logo.png',
    tag: 'IndieGala',
  },
  humble: {
    name: 'Humble Bundle',
    color: 0xcc292b, // Humble red
    iconUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Humble_Bundle_logo.svg/200px-Humble_Bundle_logo.svg.png',
    tag: 'Humble',
  },
  itchio: {
    name: 'Itch.io',
    color: 0xfa5c5c, // Itch red
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Itch.io_logo.svg/200px-Itch.io_logo.svg.png',
    tag: 'Itch.io',
  },
  ubisoft: {
    name: 'Ubisoft',
    color: 0x0070ff, // Ubisoft blue
    iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Ubisoft_logo.svg/200px-Ubisoft_logo.svg.png',
    tag: 'Ubisoft',
  },
  ea: {
    name: 'EA App',
    color: 0xff4747, // EA red
    iconUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Electronic-Arts-Logo.svg/200px-Electronic-Arts-Logo.svg.png',
    tag: 'EA',
  },
  prime: {
    name: 'Prime Gaming',
    color: 0x9146ff, // Twitch purple
    iconUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Twitch_Glitch_Logo_Purple.svg/200px-Twitch_Glitch_Logo_Purple.svg.png',
    tag: 'Prime Gaming',
  },
  battlenet: {
    name: 'Battle.net',
    color: 0x00aeff, // Blizzard blue
    iconUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Battle.net_icon.svg/200px-Battle.net_icon.svg.png',
    tag: 'Battle.net',
  },
};

/**
 * Fetch official free game promotions from Epic Games Store
 */
export async function fetchEpicGamesPromotions(): Promise<FreeGameItem[]> {
  const url =
    'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US';
  try {
    const res = await fetchRaw(url);
    if (res.status >= 400 || !res.text) return [];

    const data = JSON.parse(res.text);
    const elements = data?.data?.Catalog?.searchStore?.elements;
    if (!Array.isArray(elements)) return [];

    const now = Date.now();
    const items: FreeGameItem[] = [];

    for (const el of elements) {
      // Find active 100% off promotions
      const promoOffers = el.promotions?.promotionalOffers?.[0]?.promotionalOffers;
      if (!Array.isArray(promoOffers) || promoOffers.length === 0) continue;

      const activeOffer = promoOffers.find(
        (offer: { startDate?: string; endDate?: string; discountSetting?: { discountPercentage?: number } }) => {
          if (!offer.startDate || !offer.endDate) return false;
          const start = new Date(offer.startDate).getTime();
          const end = new Date(offer.endDate).getTime();
          const is100Off = offer.discountSetting?.discountPercentage === 0;
          return now >= start && now < end && is100Off;
        },
      );

      if (!activeOffer) continue;

      const title = decodeHtmlEntities(el.title || 'Free Game on Epic Games Store');
      const desc = stripHtml(el.description || 'Claim this game for free on the Epic Games Store.') || '';

      // Determine product slug / URL
      let slug = el.productSlug || el.urlSlug;
      if (!slug && Array.isArray(el.catalogNs?.mappings) && el.catalogNs.mappings.length > 0) {
        slug = el.catalogNs.mappings[0].pageSlug;
      }
      if (!slug && Array.isArray(el.offerMappings) && el.offerMappings.length > 0) {
        slug = el.offerMappings[0].pageSlug;
      }
      const storeUrl = slug
        ? `https://store.epicgames.com/p/${slug.replace(/\/home$/, '')}`
        : 'https://store.epicgames.com/free-games';

      // Pick best banner image
      let imageUrl: string | null = null;
      if (Array.isArray(el.keyImages)) {
        const wide = el.keyImages.find(
          (img: { type?: string; url?: string }) =>
            img.url &&
            (img.type === 'OfferImageWide' ||
              img.type === 'DieselStoreFrontWide' ||
              img.type === 'featuredMedia' ||
              img.type === 'Thumbnail'),
        );
        imageUrl = wide?.url || el.keyImages[0]?.url || null;
      }

      // Format price/worth
      const origPrice = el.price?.totalPrice?.originalPrice;
      const fmtPrice = el.price?.totalPrice?.fmtPrice?.originalPrice;
      const worth = fmtPrice || (origPrice ? `$${(origPrice / 100).toFixed(2)}` : 'Free to Keep');

      // Format end date
      let endDateStr: string | null = null;
      if (activeOffer.endDate) {
        try {
          const d = new Date(activeOffer.endDate);
          endDateStr = d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
          });
        } catch {
          endDateStr = activeOffer.endDate;
        }
      }

      items.push({
        id: `epic:${el.id || slug || title}`,
        title,
        description: desc,
        platform: 'Epic Games Store',
        platformKey: 'epic',
        url: storeUrl,
        worth: worth.includes('Free') ? worth : `${worth} (100% OFF)`,
        imageUrl,
        thumbnailUrl: PLATFORM_BRANDING.epic.iconUrl,
        endDate: endDateStr,
        publishedAt: activeOffer.startDate || el.effectiveDate || null,
      });
    }

    return items;
  } catch {
    return [];
  }
}

/**
 * Fetch giveaways from GamerPower API covering Steam, GOG, and Epic Games Store
 */
export async function fetchGamerPowerGiveaways(platformKey: FreeGamePlatformKey = 'all'): Promise<FreeGameItem[]> {
  const platformParam =
    platformKey === 'epic'
      ? 'epic-games-store'
      : platformKey === 'steam'
        ? 'steam'
        : platformKey === 'gog'
          ? 'gog'
          : platformKey === 'indiegala'
            ? 'indiegala'
            : platformKey === 'humble'
              ? 'humble-bundle'
              : platformKey === 'itchio'
                ? 'itchio'
                : platformKey === 'ubisoft'
                  ? 'ubisoft'
                  : platformKey === 'ea'
                    ? 'origin'
                    : platformKey === 'prime'
                      ? 'prime-gaming'
                      : platformKey === 'battlenet'
                        ? 'battlenet'
                        : 'pc';

  const url = `https://www.gamerpower.com/api/giveaways?platform=${platformParam}&type=game`;
  try {
    const res = await fetchRaw(url);
    if (res.status >= 400 || !res.text) return [];

    const data = JSON.parse(res.text);
    if (!Array.isArray(data)) return [];

    const items: FreeGameItem[] = [];
    for (const item of data) {
      if (item.status !== 'Active') continue;

      const platformsStr = (item.platforms || '').toLowerCase();
      const giveawayUrl = (item.open_giveaway_url || item.gamerpower_url || '').toLowerCase();

      let detectedPlatform: FreeGameItem['platform'] = 'PC';
      let detectedKey: FreeGamePlatformKey = 'steam';

      if (platformsStr.includes('epic') || giveawayUrl.includes('epicgames.com')) {
        detectedPlatform = 'Epic Games Store';
        detectedKey = 'epic';
      } else if (platformsStr.includes('gog') || giveawayUrl.includes('gog.com')) {
        detectedPlatform = 'GOG';
        detectedKey = 'gog';
      } else if (platformsStr.includes('indiegala') || giveawayUrl.includes('indiegala.com')) {
        detectedPlatform = 'IndieGala';
        detectedKey = 'indiegala';
      } else if (platformsStr.includes('humble') || giveawayUrl.includes('humblebundle.com')) {
        detectedPlatform = 'Humble Bundle';
        detectedKey = 'humble';
      } else if (platformsStr.includes('itch') || giveawayUrl.includes('itch.io')) {
        detectedPlatform = 'Itch.io';
        detectedKey = 'itchio';
      } else if (
        platformsStr.includes('ubisoft') ||
        platformsStr.includes('uplay') ||
        giveawayUrl.includes('ubisoft.com')
      ) {
        detectedPlatform = 'Ubisoft';
        detectedKey = 'ubisoft';
      } else if (platformsStr.includes('origin') || platformsStr.includes('ea') || giveawayUrl.includes('ea.com')) {
        detectedPlatform = 'EA App';
        detectedKey = 'ea';
      } else if (
        platformsStr.includes('prime') ||
        platformsStr.includes('twitch') ||
        giveawayUrl.includes('amazon.com')
      ) {
        detectedPlatform = 'Prime Gaming';
        detectedKey = 'prime';
      } else if (
        platformsStr.includes('battlenet') ||
        platformsStr.includes('blizzard') ||
        giveawayUrl.includes('battle.net')
      ) {
        detectedPlatform = 'Battle.net';
        detectedKey = 'battlenet';
      } else if (platformsStr.includes('steam') || giveawayUrl.includes('steampowered.com')) {
        detectedPlatform = 'Steam';
        detectedKey = 'steam';
      }

      if (platformKey !== 'all' && detectedKey !== platformKey) continue;

      const branding = PLATFORM_BRANDING[detectedKey] || PLATFORM_BRANDING['steam'];
      const title = decodeHtmlEntities(item.title || 'Free Game Giveaway');
      const desc = stripHtml(item.description || item.instructions || '') || '';
      const worth = item.worth && item.worth !== 'N/A' ? `${item.worth} (100% OFF)` : 'Free to Keep';

      let endDateStr: string | null = null;
      if (item.end_date && item.end_date !== 'N/A') {
        try {
          const d = new Date(item.end_date);
          endDateStr = d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
        } catch {
          endDateStr = item.end_date;
        }
      }

      items.push({
        id: `${detectedKey}:${item.id || title}`,
        title,
        description: desc,
        platform: detectedPlatform,
        platformKey: detectedKey,
        url: item.open_giveaway_url || item.gamerpower_url || '',
        worth,
        imageUrl: item.image || item.thumbnail || null,
        thumbnailUrl: branding.iconUrl,
        endDate: endDateStr,
        publishedAt: item.published_date || null,
      });
    }

    return items;
  } catch {
    return [];
  }
}

/**
 * Fetch unified free games list for any requested platform
 */
export async function fetchFreeGames(platform: FreeGamePlatformKey = 'all'): Promise<FreeGameItem[]> {
  const fetchers: Array<Promise<FreeGameItem[]>> = [];

  if (platform === 'all' || platform === 'epic') {
    fetchers.push(fetchEpicGamesPromotions());
  }

  fetchers.push(fetchGamerPowerGiveaways(platform));

  const results = await Promise.all(fetchers);
  const allItems = results.flat();

  // Deduplicate by clean title + platformKey
  const seen = new Set<string>();
  const uniqueItems: FreeGameItem[] = [];

  for (const item of allItems) {
    const cleanKey = `${item.platformKey}:${item.title.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    if (seen.has(cleanKey)) continue;
    seen.add(cleanKey);
    uniqueItems.push(item);
  }

  return uniqueItems;
}
