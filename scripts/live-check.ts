import { buildAdvancedMessage } from './advanced-message.js';
import { sendAllFormats } from './telegram.js';

const token = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;

if (!token || !chatId) {
  console.error('Set BOT_TOKEN and CHAT_ID to run the live Telegram check.');
  process.exit(1);
}

const results = await sendAllFormats(buildAdvancedMessage(), {
  token,
  chatId,
  deleteMessages: process.env.DELETE_MESSAGES === '1',
});

if (results.some((result) => !result.ok)) process.exit(1);
