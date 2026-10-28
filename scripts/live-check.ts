import {
  bold,
  dateTime,
  expandableQuote,
  fmt,
  italic,
  link,
  pre,
  toTelegramPayload,
  type TelegramPayloadFormat,
} from '../src/index.js';

interface TelegramResult {
  message_id: number;
}

interface TelegramResponse {
  ok: boolean;
  description?: string;
  result?: TelegramResult;
}

const token = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;

if (!token || !chatId) {
  console.error('Set BOT_TOKEN and CHAT_ID to run the live Telegram check.');
  process.exit(1);
}

const message = fmt`Live check ${bold('entities')} / ${italic('HTML')} / ${link('MarkdownV2', 'https://example.com')}
${pre('const ok = true;', 'ts')}
${expandableQuote('Expandable quote content')}
${dateTime('March 17, 2022, 22:45', 1647531900, 'wDT')}`;

const formats: TelegramPayloadFormat[] = ['entities', 'HTML', 'MarkdownV2'];
let failures = 0;

for (const format of formats) {
  const payload = toTelegramPayload(message, format);
  const response = await sendMessage(token, chatId, payload);
  const result = (await response.json()) as TelegramResponse;

  if (!response.ok || !result.ok || result.result === undefined) {
    failures += 1;
    console.error(
      `${format}: failed (${result.description ?? response.status})`,
    );
    continue;
  }

  console.log(`${format}: sent message ${result.result.message_id}`);

  if (process.env.DELETE_MESSAGES === '1') {
    await deleteMessage(token, chatId, result.result.message_id);
  }
}

if (failures > 0) process.exit(1);

function sendMessage(
  botToken: string,
  targetChat: string,
  payload: ReturnType<typeof toTelegramPayload>,
): Promise<Response> {
  return fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChat,
        ...payload,
        link_preview_options: { is_disabled: true },
      }),
    },
  );
}

async function deleteMessage(
  botToken: string,
  targetChat: string,
  messageId: number,
): Promise<void> {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/deleteMessage`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: targetChat, message_id: messageId }),
    },
  );
  const result = (await response.json()) as TelegramResponse;

  if (!result.ok) {
    console.warn(
      `deleteMessage ${messageId}: ${result.description ?? 'failed'}`,
    );
  }
}
