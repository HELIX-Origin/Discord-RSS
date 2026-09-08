export interface FeedPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  url: string;
}

/**
 * Curated catalog of popular, stable RSS/Atom feeds.
 * URLs verified against curated directory listings (Feedspot, FeedWind, RSSly,
 * rssapi.net, daige.st, feed.mikle.com) as of the 2026 revision.
 */
export const FEED_PRESETS: FeedPreset[] = [
  // ===================== Technology =====================
  { id: 'hn-frontpage', category: 'Technology', name: 'Hacker News', description: 'Tech startup & engineering front-page stories.', url: 'https://news.ycombinator.com/rss' },
  { id: 'hn-frontpage-points', category: 'Technology', name: 'Hacker News (100+ pts)', description: 'Only HN front-page posts with 100+ points.', url: 'https://hnrss.org/frontpage?points=100' },
  { id: 'the-verge', category: 'Technology', name: 'The Verge', description: 'Technology, science, art and culture.', url: 'https://www.theverge.com/rss/index.xml' },
  { id: 'ars-technica', category: 'Technology', name: 'Ars Technica', description: 'In-depth tech news and analysis.', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { id: 'techcrunch', category: 'Technology', name: 'TechCrunch', description: 'Startups, VC and tech industry news.', url: 'https://techcrunch.com/feed/' },
  { id: 'engadget', category: 'Technology', name: 'Engadget', description: 'Consumer electronics and gadgets.', url: 'https://www.engadget.com/rss.xml' },
  { id: 'techmeme', category: 'Technology', name: 'Techmeme', description: 'Essential tech news of the moment.', url: 'https://www.techmeme.com/feed.xml' },
  { id: 'wired', category: 'Technology', name: 'WIRED', description: 'Tech, culture and the future of everything.', url: 'https://www.wired.com/feed/rss' },
  { id: 'mit-tr', category: 'Technology', name: 'MIT Technology Review', description: 'Research and science with editorial context.', url: 'https://www.technologyreview.com/feed/' },
  { id: 'ieee-spectrum', category: 'Technology', name: 'IEEE Spectrum', description: 'Engineering, computing and applied science.', url: 'https://spectrum.ieee.org/feeds/feed.rss' },
  { id: 'cnet', category: 'Technology', name: 'CNET', description: 'Consumer tech reviews and news.', url: 'https://www.cnet.com/rss/all/' },
  { id: 'techradar', category: 'Technology', name: 'TechRadar', description: 'Gadgets, reviews and buying guides.', url: 'https://www.techradar.com/feeds.xml' },
  { id: 'product-hunt', category: 'Technology', name: 'Product Hunt', description: 'Daily featured product launches.', url: 'https://www.producthunt.com/feed' },
  { id: 'cloudflare-blog', category: 'Technology', name: 'Cloudflare Blog', description: 'Internet infrastructure engineering posts.', url: 'https://blog.cloudflare.com/rss/' },

  // ===================== Artificial Intelligence =====================
  { id: 'marktechpost', category: 'Artificial Intelligence', name: 'MarkTechPost', description: 'ML research, models and tooling news.', url: 'https://www.marktechpost.com/feed/' },
  { id: 'openai-news', category: 'Artificial Intelligence', name: 'OpenAI News', description: 'Official OpenAI product and model updates.', url: 'https://openai.com/news/rss.xml' },
  { id: 'huggingface', category: 'Artificial Intelligence', name: 'Hugging Face Blog', description: 'Open-source models and ML tooling.', url: 'https://huggingface.co/blog/feed.xml' },
  { id: 'google-deepmind', category: 'Artificial Intelligence', name: 'Google DeepMind', description: 'AI research breakthroughs from DeepMind.', url: 'https://deepmind.google/blog/rss.xml' },
  { id: 'google-research', category: 'Artificial Intelligence', name: 'Google Research Blog', description: 'Research from Google Brain, Maps, and more.', url: 'https://research.google/blog/rss/' },
  { id: 'venturebeat-ai', category: 'Artificial Intelligence', name: 'VentureBeat AI', description: 'Enterprise AI news and analysis.', url: 'https://venturebeat.com/category/ai/feed/' },
  { id: 'simonwillison', category: 'Artificial Intelligence', name: "Simon Willison's Weblog", description: 'Hands-on AI tools & Python notes.', url: 'https://simonwillison.net/atom/entries/' },
  { id: 'arxiv-cs-ai', category: 'Artificial Intelligence', name: 'arXiv cs.AI', description: 'Latest AI papers on arXiv.', url: 'https://export.arxiv.org/rss/cs.AI' },
  { id: 'mit-ai', category: 'Artificial Intelligence', name: 'MIT AI News', description: 'MIT news tagged artificial intelligence.', url: 'https://news.mit.edu/rss/topic/artificial-intelligence2' },

  // ===================== Cybersecurity =====================
  { id: 'bleepingcomputer', category: 'Cybersecurity', name: 'BleepingComputer', description: 'Security, malware and tech support news.', url: 'https://www.bleepingcomputer.com/feed/' },
  { id: 'the-hacker-news', category: 'Cybersecurity', name: 'The Hacker News', description: 'Infosec, hacking and privacy headlines.', url: 'https://feeds.feedburner.com/TheHackersNews' },
  { id: 'krebs-on-security', category: 'Cybersecurity', name: 'Krebs on Security', description: 'Brian Krebs on cybercrime investigations.', url: 'https://krebsonsecurity.com/feed/' },
  { id: 'nvd-cve', category: 'Cybersecurity', name: 'NVD CVE Feed (tsec.ai)', description: 'New and modified CVEs from NVD.', url: 'https://tsec.ai/feed/cve.xml' },
  { id: 'tsec-news', category: 'Cybersecurity', name: 'tsec.ai Security News', description: 'Aggregated breaking security news.', url: 'https://tsec.ai/feed/news.xml' },
  { id: 'sans-isc', category: 'Cybersecurity', name: 'SANS Internet Storm Center', description: 'Global threat level and advisories.', url: 'https://isc.sans.edu/rssfeed.xml' },

  // ===================== World News =====================
  { id: 'bbc-world', category: 'World News', name: 'BBC World', description: 'BBC international news coverage.', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { id: 'guardian-world', category: 'World News', name: 'The Guardian – World', description: 'Guardian world news.', url: 'https://www.theguardian.com/world/rss' },
  { id: 'nytimes-world', category: 'World News', name: 'NYT – World', description: 'New York Times world news.', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' },
  { id: 'nytimes-home', category: 'World News', name: 'NYT – Home Page', description: 'New York Times top stories.', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' },
  { id: 'washington-post-world', category: 'World News', name: 'Washington Post – World', description: 'WaPo world news.', url: 'https://feeds.washingtonpost.com/rss/world' },
  { id: 'al-jazeera', category: 'World News', name: 'Al Jazeera', description: 'Global news with a non-Western perspective.', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { id: 'ap-top-news', category: 'World News', name: 'Associated Press', description: 'AP top news headlines.', url: 'https://apnews.com/rss/TopNews' },
  { id: 'cnn-world', category: 'World News', name: 'CNN – International', description: 'CNN edition world headlines.', url: 'http://rss.cnn.com/rss/edition.rss' },
  { id: 'reuters-gnews', category: 'World News', name: 'Reuters (via Google News)', description: 'Reuters stories via a Google News search feed.', url: 'https://news.google.com/rss/search?q=when:1d+allinurl:reuters.com&hl=en-US&gl=US&ceid=US:en' },
  { id: 'gnews-top', category: 'World News', name: 'Google News – Top Stories', description: 'Google News US top stories.', url: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en' },
  { id: 'gnews-world', category: 'World News', name: 'Google News – World', description: 'Google News world section.', url: 'https://news.google.com/rss/headlines/section/TOPIC/WORLD?hl=en-US&gl=US&ceid=US:en' },
  { id: 'gnews-business', category: 'World News', name: 'Google News – Business', description: 'Google News business section.', url: 'https://news.google.com/rss/headlines/section/TOPIC/BUSINESS?hl=en-US&gl=US&ceid=US:en' },

  // ===================== US News & Politics =====================
  { id: 'npr', category: 'US News', name: 'NPR – News', description: 'US and world news, culture, technology.', url: 'https://feeds.npr.org/1001/rss.xml' },
  { id: 'npr-economy', category: 'US News', name: 'NPR – Economy', description: 'NPR economy reporting.', url: 'https://feeds.npr.org/1006/rss.xml' },
  { id: 'nbc-news', category: 'US News', name: 'NBC News', description: 'NBC top stories.', url: 'https://feeds.nbcnews.com/feeds/topstories' },
  { id: 'usa-today', category: 'US News', name: 'USA Today', description: 'USA Today top stories.', url: 'https://rssfeeds.usatoday.com/usatoday-newstopstories' },
  { id: 'politico', category: 'US News', name: 'Politico', description: 'Politics picks and analysis.', url: 'https://www.politico.com/rss/politicopicks.xml' },
  { id: 'the-hill', category: 'US News', name: 'The Hill', description: 'Congress, politics and policy news.', url: 'https://thehill.com/feed/' },
  { id: 'huffpost-world', category: 'US News', name: 'HuffPost – World', description: 'HuffPost world news vertical.', url: 'https://chaski.huffpost.com/us/auto/vertical/world-news' },

  // ===================== Business & Finance =====================
  { id: 'cnbc-top', category: 'Business & Finance', name: 'CNBC – Top News', description: 'CNBC top financial and business news.', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
  { id: 'financial-times', category: 'Business & Finance', name: 'Financial Times', description: 'FT international news and analysis.', url: 'https://www.ft.com/rss/home/international' },
  { id: 'bbc-business', category: 'Business & Finance', name: 'BBC – Business', description: 'BBC business and markets news.', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { id: 'bbc-technology', category: 'Business & Finance', name: 'BBC – Technology', description: 'BBC technology news.', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
  { id: 'marketwatch', category: 'Business & Finance', name: 'MarketWatch – Top Stories', description: 'Markets, and personal finance news.', url: 'https://feeds.marketwatch.com/marketwatch/topstories/' },
  { id: 'wsj-business', category: 'Business & Finance', name: 'WSJ – Business', description: 'Wall Street Journal business section.', url: 'https://feeds.content.dowjones.io/public/rss/WSJcomUSBusiness' },
  { id: 'wsj-world', category: 'Business & Finance', name: 'WSJ – World News', description: 'Wall Street Journal world news.', url: 'https://feeds.content.dowjones.io/public/rss/RSSWorldNews.xml' },

  // ===================== Sports =====================
  { id: 'espn', category: 'Sports', name: 'ESPN', description: 'ESPN top sports news.', url: 'https://www.espn.com/espn/rss/news' },
  { id: 'bbc-sport', category: 'Sports', name: 'BBC Sport', description: 'BBC sport headlines and results.', url: 'https://feeds.bbci.co.uk/sport/rss.xml' },
  { id: 'sky-sports', category: 'Sports', name: 'Sky Sports', description: 'Sky Sports home news.', url: 'https://www.skysports.com/rss/12040' },
  { id: 'si-top-stories', category: 'Sports', name: 'Sports Illustrated', description: 'SI top stories.', url: 'https://www.si.com/rss/si_topstories.rss' },

  // ===================== Science & Space =====================
  { id: 'science-daily', category: 'Science & Space', name: 'ScienceDaily', description: 'Breaking science research news.', url: 'https://www.sciencedaily.com/rss/all.xml' },
  { id: 'space', category: 'Science & Space', name: 'Space.com', description: 'Space exploration and astronomy.', url: 'https://www.space.com/feeds/all' },
  { id: 'nasa', category: 'Science & Space', name: 'NASA – Breaking News', description: 'NASA breaking news & launches.', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss' },
  { id: 'sciam', category: 'Science & Space', name: 'Scientific American', description: 'Science magazine news and opinion.', url: 'https://rss.sciam.com/ScientificAmerican-Global' },
  { id: 'phys-org', category: 'Science & Space', name: 'Phys.org', description: 'Latest science research news.', url: 'https://phys.org/rss-feed/' },
  { id: 'smithsonian', category: 'Science & Space', name: 'Smithsonian Magazine', description: 'Science, history, culture and research.', url: 'https://www.smithsonianmag.com/rss/' },

  // ===================== Gaming =====================
  { id: 'pc-gamer', category: 'Gaming', name: 'PC Gamer', description: 'PC gaming news, reviews and features.', url: 'https://www.pcgamer.com/rss/' },
  { id: 'polygon', category: 'Gaming', name: 'Polygon', description: 'Games, media and entertainment.', url: 'https://www.polygon.com/rss/index.xml' },
  { id: 'eurogamer', category: 'Gaming', name: 'Eurogamer', description: 'Video game news, reviews and previews.', url: 'https://www.eurogamer.net/feed' },
  { id: 'eurogamer-news', category: 'Gaming', name: 'Eurogamer – News', description: 'Eurogamer news-only channel.', url: 'https://www.eurogamer.net/feed/news' },
  { id: 'ign', category: 'Gaming', name: 'IGN', description: 'Games, movies and entertainment.', url: 'https://feeds.ign.com/ign/all' },
  { id: 'kotaku', category: 'Gaming', name: 'Kotaku', description: 'Gaming news, reviews and culture.', url: 'https://kotaku.com/rss' },
  { id: 'gematsu', category: 'Gaming', name: 'Gematsu', description: 'Japanese gaming news and releases.', url: 'https://www.gematsu.com/feed' },
  { id: 'rock-paper-shotgun', category: 'Gaming', name: 'Rock Paper Shotgun', description: 'PC, indie and multiplayer games.', url: 'https://www.rockpapershotgun.com/feed' },
  { id: 'nintendo-life', category: 'Gaming', name: 'Nintendo Life', description: 'Nintendo games, hardware and reviews.', url: 'https://www.nintendolife.com/feeds/latest' },
  { id: 'destructoid', category: 'Gaming', name: 'Destructoid', description: 'Independent gaming news and reviews.', url: 'https://www.destructoid.com/feed/' },
  { id: 'game-developer', category: 'Gaming', name: 'Game Developer', description: 'Game production and design (ex-Gamasutra).', url: 'https://www.gamedeveloper.com/rss.xml' },
  { id: 'indie-db', category: 'Gaming', name: 'IndieDB', description: 'Indie game news straight from developers.', url: 'https://rss.indiedb.com/headlines/feed/rss.xml' },
  { id: 'gamersnexus', category: 'Gaming', name: 'GamersNexus', description: 'PC hardware deep-dives and tech reviews.', url: 'https://gamersnexus.net/rss.xml' },
  { id: 'xbox-wire', category: 'Gaming', name: 'Xbox Wire', description: 'Official Xbox news and platform updates.', url: 'https://news.xbox.com/en-us/feed/' },
  { id: 'godot', category: 'Gaming', name: 'Godot Engine Blog', description: 'Open-source game engine development.', url: 'https://godotengine.org/rss.xml' },

  // ===================== Entertainment =====================
  { id: 'variety', category: 'Entertainment', name: 'Variety', description: 'Film, TV, music and showbiz.', url: 'https://variety.com/feed/' },
  { id: 'hollywood-reporter', category: 'Entertainment', name: 'The Hollywood Reporter', description: 'Entertainment industry and breaking news.', url: 'https://www.hollywoodreporter.com/feed/' },
  { id: 'deadline', category: 'Entertainment', name: 'Deadline', description: 'Hollywood breaking news.', url: 'https://deadline.com/feed/' },
  { id: 'rolling-stone', category: 'Entertainment', name: 'Rolling Stone', description: 'Music, politics and culture.', url: 'https://www.rollingstone.com/feed/' },
  { id: 'pitchfork-news', category: 'Entertainment', name: 'Pitchfork – News', description: 'Independent music news.', url: 'https://pitchfork.com/feed/feed-news/rss/' },
  { id: 'landmark-verge-culture', category: 'Entertainment', name: 'The Verge – Entertainment', description: 'Verge entertainment and culture.', url: 'https://www.theverge.com/rss/entertainment/index.xml' },

  // ===================== Programming & Open Source =====================
  { id: 'github-blog', category: 'Programming', name: 'GitHub Blog', description: 'GitHub features, changelog and stories.', url: 'https://github.blog/feed/' },
  { id: 'bytebytego', category: 'Programming', name: 'ByteByteGo', description: 'System design education and diagrams.', url: 'https://blog.bytebytego.com/feed' },
  { id: 'mozilla-blog', category: 'Programming', name: 'Mozilla Blog', description: 'Firefox and open web news.', url: 'https://blog.mozilla.org/feed/' },
  { id: 'python-blog', category: 'Programming', name: 'Python.org Blog', description: 'Python language and ecosystem updates.', url: 'https://blog.python.org/feeds/posts/default' },

  // ===================== Cryptocurrency =====================
  { id: 'coindesk', category: 'Cryptocurrency', name: 'CoinDesk', description: 'Bitcoin, Ethereum, DeFi and Web3 news.', url: 'https://www.coindesk.com/arc/outboundfeeds/rss' },
  { id: 'cointelegraph', category: 'Cryptocurrency', name: 'CoinTelegraph', description: 'Blockchain and crypto analysis.', url: 'https://cointelegraph.com/rss' },
  { id: 'decrypt', category: 'Cryptocurrency', name: 'Decrypt', description: 'Crypto and the decentralized web.', url: 'https://decrypt.co/feed' },
  { id: 'cryptoslate', category: 'Cryptocurrency', name: 'CryptoSlate', description: 'Crypto news and real-time coin data.', url: 'https://cryptoslate.com/feed/' },
  { id: 'bitcoin-magazine', category: 'Cryptocurrency', name: 'Bitcoin Magazine', description: 'Bitcoin news and expert insights.', url: 'https://bitcoinmagazine.com/.rss/full/' },
  { id: 'cryptopotato', category: 'Cryptocurrency', name: 'CryptoPotato', description: 'Crypto market and price news.', url: 'https://cryptopotato.com/feed/' },

  // ===================== Reddit communities =====================
  { id: 'reddit-technology', category: 'Reddit', name: 'r/technology', description: 'Technology subreddit.', url: 'https://www.reddit.com/r/technology/.rss' },
  { id: 'reddit-worldnews', category: 'Reddit', name: 'r/worldnews', description: 'World news subreddit.', url: 'https://www.reddit.com/r/worldnews/.rss' },
  { id: 'reddit-gaming', category: 'Reddit', name: 'r/gaming', description: 'Gaming subreddit.', url: 'https://www.reddit.com/r/gaming/.rss' },
  { id: 'reddit-science', category: 'Reddit', name: 'r/science', description: 'Science subreddit.', url: 'https://www.reddit.com/r/science/.rss' },
  { id: 'reddit-indiegaming', category: 'Reddit', name: 'r/IndieGaming', description: 'Indie games subreddit.', url: 'https://www.reddit.com/r/IndieGaming/.rss' },
  { id: 'reddit-programming', category: 'Reddit', name: 'r/programming', description: 'Programming subreddit.', url: 'https://www.reddit.com/r/programming/.rss' },
  { id: 'reddit-ai', category: 'Reddit', name: 'r/artificial', description: 'AI & AGI subreddit.', url: 'https://www.reddit.com/r/artificial/.rss' },
];

export function presetsGroupedByCategory(): Map<string, FeedPreset[]> {
  const groups = new Map<string, FeedPreset[]>();
  for (const preset of FEED_PRESETS) {
    const list = groups.get(preset.category) ?? [];
    list.push(preset);
    groups.set(preset.category, list);
  }
  return groups;
}