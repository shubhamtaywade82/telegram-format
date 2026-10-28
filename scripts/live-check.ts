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
  parameters?: { retry_after?: number };
  result?: TelegramResult;
}

interface TelegramCall {
  ok: boolean;
  status: number;
  description: string | undefined;
  result: TelegramResult | undefined;
}

const MAX_MESSAGE_LENGTH = 4096;
const SEND_DELAY_MS = 1_100;
const MAX_RATE_LIMIT_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 15_000;

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

for (const [index, format] of formats.entries()) {
  if (index > 0) await sleep(SEND_DELAY_MS);

  const payload = toTelegramPayload(message, format);
  assertPayloadLength(payload.text, format);

  const call = await callTelegram(token, 'sendMessage', {
    chat_id: chatId,
    ...payload,
    link_preview_options: { is_disabled: true },
  });

  if (!call.ok || call.result === undefined) {
    failures += 1;
    console.error(
      `${format}: failed (${call.description ?? `HTTP ${call.status}`})`,
    );
    continue;
  }

  console.log(`${format}: sent message ${call.result.message_id}`);

  if (process.env.DELETE_MESSAGES === '1') {
    await deleteMessage(token, chatId, call.result.message_id);
  }
}

if (failures > 0) process.exit(1);

function assertPayloadLength(
  text: string,
  format: TelegramPayloadFormat,
): void {
  if (text.length === 0 || text.length > MAX_MESSAGE_LENGTH) {
    throw new RangeError(
      `${format}: text must be 1-${MAX_MESSAGE_LENGTH} UTF-16 code units (got ${text.length})`,
    );
  }
}

async function callTelegram(
  botToken: string,
  method: string,
  body: Record<string, unknown>,
): Promise<TelegramCall> {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/${method}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
    const result = (await response.json()) as TelegramResponse;
    const call: TelegramCall = {
      ok: response.ok && result.ok,
      status: response.status,
      description: result.description,
      result: result.result,
    };

    if (response.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) {
      return call;
    }

    const retryAfter = result.parameters?.retry_after ?? 1;
    console.warn(`${method}: rate limited, retrying in ${retryAfter}s`);
    await sleep((retryAfter + 0.5) * 1000);
  }
}

async function deleteMessage(
  botToken: string,
  targetChat: string,
  messageId: number,
): Promise<void> {
  const call = await callTelegram(botToken, 'deleteMessage', {
    chat_id: targetChat,
    message_id: messageId,
  });

  if (!call.ok) {
    console.warn(
      `deleteMessage ${messageId}: ${call.description ?? `HTTP ${call.status}`}`,
    );
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
