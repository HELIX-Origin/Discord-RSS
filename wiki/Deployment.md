# Deployment Guide

This guide provides instructions for deploying the Discord RSS service, including setup on various hosting environments and configuration options.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 22 or higher)
- [Git](https://git-scm.com/) (for cloning the repository)
- [GitHub CLI](https://cli.github.com/) (optional: for improved GitHub interaction from the command line)

## Deployment Steps

### Local or VPS Deployment

**Windows**:

- Open a terminal (Command Prompt or PowerShell) and navigate to the directory where you want to clone the repository.
- Clone the repository using Git:

  ```bash
  git clone https://github.com/HELIX-Origin/Discord-RSS.git
  cd Discord-RSS
  ```

- Install the required dependencies using Node.js:

  ```bash
  npm install
  ```
  
- Copy the `.env.example` file to `.env` and provide the necessary environment variables.
- Start the Discord RSS service:

  ```bash
  npm start
  ```

**Linux or macOS**:

- Open a terminal and navigate to the directory where you want to clone the repository.
- Clone the repository using Git:

  ```bash
  git clone https://github.com/HELIX-Origin/Discord-RSS.git
  cd Discord-RSS
  ```
- Install the required dependencies using Node.js:

  ```bash
  npm install
  ```
- Copy the `.env.example` file to `.env` and provide the necessary environment variables.
- Start the Discord RSS service:

  ```bash
  npm start
  ```

### Cloud Hosting Services

- Login to your desired cloud hosting service (e.g., Heroku, AWS, Google Cloud) and create a new application or instance for the Discord RSS service.
- Deploy the cloned repository to your cloud hosting service following their specific deployment instructions.
- Configure environment variables and other necessary settings for your cloud deployment.
- Start the application through your cloud hosting service's management interface.

## Environment Variables

- `DISCORD_RSS_PORT`: Port on which the Discord RSS service will run. (default: 3434)
- `DISCORD_RSS_HOST`: Host address for the Discord RSS service. (default: 127.0.0.1)
- `DISCORD_RSS_DATA`: Path to the main data directory for the Discord RSS service. (default: ./data)
- `DISCORD_RSS_POLL_INTERVAL_MS`: Polling interval in milliseconds for fetching RSS feeds. (default: 60000)
- `DISCORD_RSS_STATUS_INTERVAL_MS`: Interval in milliseconds for updating the service status. (default: 30000)
- `DISCORD_RSS_REQUEST_TIMEOUT_MS`: Request timeout in milliseconds for the Discord RSS service. (default: 15000)
- `DISCORD_RSS_PUBLIC_BASE_URL`: Public base URL for the Discord RSS service. (Leave blank if only using locally)
- `DISCORD_RSS_REDIS_PORT`: Port for the Redis instance used by the Discord RSS service. (Leave blank if not using Redis) (default: 6379)
- `DISCORD_RSS_REDIS_URL`: URL for the Redis instance used by the Discord RSS service. (Leave blank if not using Redis)
- `DISCORD_RSS_TEST_DATA`: Path to the test data directory for the Discord RSS service. (default: ./data/.tmp)
- `DISCORD_RSS_LOG_LEVEL`: Logging level for the Discord RSS service. (default: info)

### Logging Levels

- `error`: Only log error messages.
- `warn`: Log warnings and errors.
- `info`: Log informational messages, warnings, and errors.
- `debug`: Log detailed debugging information, informational messages, warnings, and errors.

## Additional Notes

- Plans to add one-click deployment for popular cloud hosting services like Heroku, Render, Fyl.io, and Railway are underway. 
- Users are encouraged to check the official repository for updates and new deployment options.