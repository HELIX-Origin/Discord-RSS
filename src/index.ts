import { handleFeed } from './handlers/feed';
import { handleStatus } from './handlers/status';

console.log('Site-Feed-Discord TypeScript module initialized');
console.log('Primary webhook method: Discohook (requires bot invitation)');
console.log('Feed secrets naming: {SOURCE}_RSS_URL_{###}');
console.log('Webhook secrets naming: {SERVICE_NAME}_WEBHOOK_URL_{###}');

handleFeed();
handleStatus();
