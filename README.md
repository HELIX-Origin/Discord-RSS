<div align="center">
<img src="banner.png" width="98%" height="auto" />
<h1>HELIX RSS</h1>
<p>A lightweight and efficient utility designed to bridge RSS and Atom feeds directly into Discord channels.</p>
</div>

## Overview

**HELIX RSS** automates content delivery from RSS and Atom feeds straight into your Discord server channels using the built-in Discord Bot. Whether you're tracking release logs, blog updates, or news streams, this tool keeps your community in the loop without manual monitoring.

## Features

* **Automated Feed Polling:** Regularly checks configured RSS/Atom endpoints for new items with hourly rate-limiting.
* **Discord Bot Channel Integration:** Cleanly formats and pushes rich embed updates straight to designated channels, with interactive Discord slash commands (`/feed`, `/stats`, `/about`, `/help`).
* **Lightweight and Efficient:** Minimal resource usage with zero runtime dependencies while maintaining high performance.

## Documentation & Wiki

Detailed guides, configuration instructions, and advanced setup documentation are maintained in the project wiki:

* [Home & Getting Started](https://github.com/HELIX-Origin/HELIX-RSS/wiki/Home)
* [Configuration Guide](https://github.com/HELIX-Origin/HELIX-RSS/wiki/Configuration)
* [Troubleshooting](https://github.com/HELIX-Origin/HELIX-RSS/wiki/Troubleshooting)

## 💻 Local & VPS Hosting (Cross-Platform)

HELIX RSS includes built-in **automatic HTTPS** powered by an integrated Caddy reverse proxy:
- **Local Testing**: Automatically provisions a trusted local certificate for `localhost`.
- **VPS / Bare-Metal**: Automatically provisions and renews real Let's Encrypt / ZeroSSL certificates when a domain is configured via `PUBLIC_URL` (e.g. `https://rss.yourdomain.com`).
- **Zero Configuration**: Caddy is managed directly by HELIX RSS across Linux, macOS, and Windows with zero npm bloat.

### Installation & Quick Start

1. **Clone the repository:**

   ```bash
   git clone https://github.com/HELIX-Origin/HELIX-RSS.git
   cd HELIX-RSS
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env and enter your DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET
   ```

3. **Install dependencies and launch:**

   ```bash
   npm install
   npm run build
   npm start
   ```

> 📖 For a detailed setup guide covering Linux systemd services, Windows services, and Docker Compose, see the [Deployment & Hosting Wiki Guide](https://github.com/HELIX-Origin/HELIX-RSS/wiki/Deployment-and-Hosting).

## Contributing

* 💡 Contributions are welcome! Please fork the repository and submit pull requests for any improvements or bug fixes.
* 📝 Report issues and suggest features through the GitHub issue tracker.
* 🔧 Ensure that your code follows the project's coding standards and includes appropriate tests where applicable.
* 💬 Participate in discussions and provide constructive feedback on other contributors' pull requests.
* 🔄 Keep your fork up to date with the main repository to minimize merge conflicts.
* 📜 Follow the project's code of conduct to maintain a respectful and collaborative community environment.
* 📖 Review the project wiki for any changes in configuration or usage instructions to ensure smooth operation.
* 🧪 Test the setup in a controlled environment before deploying it to a live server to prevent disruptions.
* 💾 Regularly back up your configuration and important data to avoid loss in case of unexpected issues.
* 📊 Monitor the application's performance and resource usage to ensure it operates efficiently and does not negatively impact your Discord server.
* 👀 Keep an eye on the RSS feed sources for any changes in structure or availability that might affect the application's ability to fetch and post updates.
* 🌐 Engage with the community through discussions and forums to stay updated on best practices and common issues.
* 📝 Provide feedback and suggestions to help improve the project and its documentation.
* 🔔 Stay informed about updates and changes in Discord's API that might affect bot messaging functionality.

## Community Links

* 😎 [HELIX Origin Discord](https://discord.com/invite/Ww3XBZC2HV)
* 🌐 [Project Wiki](https://github.com/HELIX-Origin/HELIX-RSS/wiki)
* 🐛 [Issue Tracker](https://github.com/HELIX-Origin/HELIX-RSS/issues)
* 💡 [Feature Requests](https://github.com/HELIX-Origin/HELIX-RSS/issues?q=is%3Aissue+is%3Aopen+label%3A%22feature+request%22)