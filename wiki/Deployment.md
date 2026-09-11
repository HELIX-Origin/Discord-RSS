# Deployment Guide

This guide provides instructions for deploying the Discord RSS service, including setup on various hosting environments and configuration options.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 22.5)
- [Git](https://git-scm.com/) (for cloning the repository)
- [GitHub CLI](https://cli.github.com/) (optional: for improved GitHub interaction from the command line)
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) (optional: for managing Heroku deployments from the command line)
- [Render CLI](https://render.com/docs/cli) (optional: for managing Render deployments from the command line)
- [Fyl.io CLI](https://fyl.io/docs/cli) (optional: for managing Fyl.io deployments from the command line)
- [Railway CLI](https://railway.app/docs/cli) (optional: for managing Railway deployments from the command line)

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

- `PORT`: Port on which the Discord RSS service will run. (default: 3434)
- `HOST`: Host address for the Discord RSS service. (default: 127.0.0.1)
- `DATA`: Path to the main data directory for the Discord RSS service. (default: ./data)
- `POLL_INTERVAL_MS`: Polling interval in milliseconds for fetching RSS feeds. (default: 60000)
- `STATUS_INTERVAL_MS`: Interval in milliseconds for updating the service status. (default: 30000)
- `REQUEST_TIMEOUT_MS`: Request timeout in milliseconds for the Discord RSS service. (default: 15000)
- `PUBLIC_URL`: Public base URL for the Discord RSS service. (Leave blank if only using locally)
- `REDIS_URL`: URL for the Redis instance used by the Discord RSS service. (Leave blank if not using Redis)
- `TEST_DATA`: Path to the test data directory for the Discord RSS service. (default: ./data/.tmp)
- `LOG_LEVEL`: Logging level for the Discord RSS service. (default: info)

### Logging Levels

- `error`: Only log error messages.
- `warn`: Log warnings and errors.
- `info`: Log informational messages, warnings, and errors.
- `debug`: Log detailed debugging information, informational messages, warnings, and errors.

## Heroku Deployment (CLI)

To deploy the Discord RSS service to Heroku using the CLI, follow these steps:

1. Install the Heroku CLI if you haven't already: [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)

2. Log in to your Heroku account:

  ```bash
  heroku login
  ```

3. Create a new Heroku application:

  ```bash
  heroku create your-app-name
  ```

4. Create a Procfile for the Heroku application:

  ```bash
  echo "web: node index.js" > Procfile
  ```

5. Add the Node.JS Heroku buildpack to your Heroku application:

  ```bash
  heroku buildpacks:add heroku/nodejs
  ```

6. Set the necessary environment variables for your application:

  ```bash
  heroku config:set PORT=3434
  heroku config:set HOST=127.0.0.1
  heroku config:set DATA=./data
  heroku config:set POLL_INTERVAL_MS=60000
  heroku config:set STATUS_INTERVAL_MS=30000
  heroku config:set REQUEST_TIMEOUT_MS=15000
  heroku config:set PUBLIC_URL=https://your-app-name.herokuapp.com
  heroku config:set REDIS_URL=redis://your-redis-url:6379
  heroku config:set TEST_DATA=./test-data
  heroku config:set LOG_LEVEL=info
  ```

7. Deploy the application to Heroku:

  ```bash
  git push heroku main
  ```

8. Start the application:

  ```bash
  heroku ps:scale web=1
  ```

## Railway Deployment (CLI)

To deploy the Discord RSS service to Railway using the CLI, follow these steps:

1. Install the Railway CLI if you haven't already: [Railway CLI](https://railway.app/docs/cli)

2. Log in to your Railway account:

  ```bash
  railway login
  ```

3. Create a new Railway project:

  ```bash
  railway init your-project-name
  ```

4. Create a `Procfile` for the Railway project:

  ```bash
  echo "web: node index.js" > Procfile
  ```

5. Add the Node.JS Railway buildpack to your Railway project:
    
  ```bash
  railway buildpacks add railway/nodejs
  ```

6. Set the necessary environment variables for your project:

  ```bash
  railway variables set PORT=3434
  railway variables set HOST=127.0.0.1
  railway variables set DATA=./data
  railway variables set POLL_INTERVAL_MS=60000
  railway variables set STATUS_INTERVAL_MS=30000
  railway variables set REQUEST_TIMEOUT_MS=15000
  railway variables set PUBLIC_URL=https://your-project-name.railway.app
  railway variables set REDIS_URL=redis://your-redis-url:6379
  railway variables set TEST_DATA=./test-data
  railway variables set LOG_LEVEL=info
  ```

7. Deploy the application to Railway:

  ```bash
  railway up
  ```

## Fly.io Deployment (CLI)

To deploy the Discord RSS service to Fly.io using the CLI, follow these steps:

1. Install the Fly.io CLI if you haven't already: [Fly.io CLI](https://fly.io/docs/hands-on/installing/)

2. Log in to your Fly.io account:

  ```bash
  fly auth login
  ```

3. Create a new Fly.io application:

  ```bash
  fly launch your-app-name
  ```

4. Create a `Procfile` for the Fly.io project:

  ```bash
  echo "web: node index.js" > Procfile
  ```

5. Add the Node.JS Fly.io buildpack to your Fly.io application:

  ```bash
  fly buildpacks add fly/nodejs
  ```

6. Set the necessary environment variables for your application:

  ```bash
  fly secrets set PORT=3434
  fly secrets set HOST=127.0.0.1
  fly secrets set DATA=./data
  fly secrets set POLL_INTERVAL_MS=60000
  fly secrets set STATUS_INTERVAL_MS=30000
  fly secrets set REQUEST_TIMEOUT_MS=15000
  fly secrets set PUBLIC_URL=https://your-app-name.fly.dev
  fly secrets set REDIS_URL=redis://your-redis-url:6379
  fly secrets set TEST_DATA=./test-data
  fly secrets set LOG_LEVEL=info
  ```

7. Deploy the application to Fly.io:

  ```bash
  fly deploy
  ```

## Render Deployment (CLI)

To deploy the Discord RSS service to Render using the CLI, follow these steps:

1. Install the Render CLI if you haven't already: [Render CLI](https://render.com/docs/cli)

2. Log in to your Render account:

  ```bash
  render login
  ```

3. Create a new Render service:

  ```bash
  render create your-service-name
  ```

4. Create a `Procfile` for the Render project:

  ```bash
  echo "web: node index.js" > Procfile
  ```

5. Add the Node.JS Render buildpack to your Render service:

  ```bash
  render buildpacks add render/nodejs
  ```

6. Set the necessary environment variables for your service:

  ```bash
  render env set PORT=3434
  render env set HOST=127.0.0.1
  render env set DATA=./data
  render env set POLL_INTERVAL_MS=60000
  render env set STATUS_INTERVAL_MS=30000
  render env set REQUEST_TIMEOUT_MS=15000
  render env set PUBLIC_URL=https://your-service-name.onrender.com
  render env set REDIS_URL=redis://your-redis-url:6379
  render env set TEST_DATA=./test-data
  render env set LOG_LEVEL=info
  ```

7. Deploy the application to Render:

  ```bash
  render deploy
  ```

## Additional Notes

- Plans to add one-click deployment for popular cloud hosting services like Heroku, Render, Fyl.io, and Railway are underway. 
- Users are encouraged to check the official repository for updates and new deployment options.