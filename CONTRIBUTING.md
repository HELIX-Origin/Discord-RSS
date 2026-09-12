# Contributing to Discord-RSS

Thank you for your interest in contributing to **Discord-RSS**! We welcome contributions ranging from bug fixes, documentation enhancements, feature proposals, to adding new presets to our News Feeds and Free Games scrapers.

---

## 🌟 Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for everyone. Please be respectful, courteous, and constructive in all discussions, issues, and pull requests.

---

## 🛠️ Development Setup

### Prerequisites

- **Node.js**: >= 20.0.0 (LTS recommended)
- **npm**: >= 10.0.0
- **Git**
- A Discord Application configured with a Bot token and OAuth2 Client ID/Secret (for local testing).

### Step-by-Step Setup

1. **Fork & Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/Discord-RSS.git
   cd Discord-RSS
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the sample environment file and fill in your Discord credentials:
   ```bash
   cp .env.example .env
   ```
   *For detailed explanation of all environment variables, check the [Configuration Guide](file:///d:/Projects/Discord-RSS/wiki/Configuration.md).*

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   The web dashboard will be available at `http://localhost:3000`.

---

## 🧪 Testing and Quality Checks

Before submitting a Pull Request, make sure your code adheres to our formatting, linting, and build standards:

```bash
# Run TypeScript compilation check
npm run check

# Run ESLint validation
npm run lint

# Format codebase with Prettier
npm run format

# Run test suite
npm run test

# Verify production build
npm run build
```

---

## 📁 Repository Structure

```
Discord-RSS/
├── src/
│   ├── bot/                # Discord.js bot client, slash commands & embed generators
│   │   ├── commands/       # /feed, /stats, /about, /help
│   │   ├── client.ts       # Bot client lifecycle & registration
│   │   └── embeds.ts       # Rich embed builders for all feed types
│   ├── dashboard/          # Express web UI dashboard & API server
│   │   ├── routes/         # REST API routes (feeds, presets, settings, analytics)
│   │   ├── public/         # Vanilla CSS & client-side dashboard JS
│   │   └── server.ts       # Express server entry point
│   ├── db/                 # SQLite / PostgreSQL persistence layer & migrations
│   │   ├── database.ts     # Database connection & pooling
│   │   ├── schema.ts       # Table schemas & DDL
│   │   └── repositories/   # Feed, Guild, Settings, and Stats repositories
│   ├── feed/               # Feed engine, scrapers & background watcher
│   │   ├── parser.ts       # Fast-feed parser & fallback extractors
│   │   ├── watcher.ts      # Polling scheduler & cron engine
│   │   ├── deduplication.ts# Guid/link/hash deduplication logic
│   │   ├── freegames.ts    # Epic Promotions + GamerPower multi-platform giveaway engine
│   │   └── scrapers/       # YouTube, Reddit, Reddit Image, TikTok, Bluesky scrapers
│   ├── oauth/              # Discord OAuth2 authentication & session management
│   └── types/              # Global TypeScript interfaces & type definitions
├── wiki/                   # Complete comprehensive GitHub Wiki documentation
├── .env.example            # Environment variable template
├── Dockerfile              # Container image definition
└── docker-compose.yml      # Multi-container local deployment
```

---

## 🚀 Contribution Workflow

1. **Create a Topic Branch**:
   ```bash
   git checkout -b feature/awesome-feature
   # or
   git checkout -b fix/issue-description
   ```

2. **Make Your Changes**:
   - Write clean, well-documented, and type-safe TypeScript.
   - Keep functions focused and modular.
   - Include inline documentation for non-obvious logic.

3. **Validate Your Changes**:
   ```bash
   npm run check && npm run lint && npm run test && npm run build
   ```

4. **Commit with Clear Messages**:
   We encourage semantic, human-readable commit messages with emojis for improved clarity:
   - `✨ feat: add new giveaway platform provider`
   - `🐛 fix: resolve Reddit pure image banner thumbnail fallback`
   - `📝 docs: update API reference for free games endpoint`
   - `🎨 style: improve glassmorphism button styling`
   - `⚡ perf: optimize database query in feed watcher`

5. **Push and Open a Pull Request**:
   ```bash
   git push origin feature/awesome-feature
   ```
   Open a PR against the `main` branch with a clear description of changes, motivation, and testing steps.

---

## 💡 Adding New Feed Presets

To contribute new verified feed presets into the **News Feeds** catalog:
1. Open [`src/dashboard/routes/presets.ts`](file:///d:/Projects/Discord-RSS/src/dashboard/routes/presets.ts).
2. Locate the corresponding category array (e.g., `Technology`, `Gaming`, `AI`, `Cybersecurity`).
3. Add your verified feed entry with `name`, `url`, `description`, `icon`, and optional tags.
4. Verify that the RSS feed URL produces valid XML and responds quickly.

---

## ❓ Getting Help

- Join our Discord Community or open an issue on GitHub if you have any questions.
- Browse the [Discord-RSS Wiki](file:///d:/Projects/Discord-RSS/wiki/HOME.md) for deep dives on architecture, scrapers, and bot configuration.
