# phpBB integration

This page provides instructions for phpBB forum hosts to integrate their forums with Discord RSS.

## Setup Discord RSS service in phpBB

1. Log in to your phpBB admin control panel.
2. Look for the external service providers section in your phpBB **Settings**.
3. Add a new service for Discord RSS by providing the necessary details such as the service name, callback URL, and any required API keys or credentials.
4. Setup the a forum bot for user account authentication.
5. Look for the RSS feeds section in your phpBB **Settings** and ensure that RSS feeds are enabled and accessible.
6. Save the settings and ensure the service is active.

## Additional Notes

- Ensure that the bot user has the necessary permissions to access all the content you want to share via Discord RSS.
- Regularly update the bot user's password and API credentials to maintain security.
- Monitor the integration to ensure that updates from your phpBB forum continue to be posted to Discord RSS without issues.
- If you encounter any problems, check the phpBB logs and Discord RSS logs for troubleshooting information.


## Host Template

This template provides a general structure for integrating a phpBB forum with the Discord RSS service. It may need to be adjusted based on your specific forum setup and requirements.

```json
{
  "host": "phpBB",
  "service": "Discord RSS",
  "callback_url": "YOUR_CALLBACK_URL",
  "api_key": "YOUR_API_KEY",
  "bot_user": {
    "username": "YOUR_BOT_USERNAME",
    "password": "YOUR_BOT_PASSWORD"
  }
}
```