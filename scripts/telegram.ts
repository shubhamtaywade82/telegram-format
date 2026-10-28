import {
  toTelegramPayload,
  type FormattedMessage,
  type TelegramPayload,
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
  retryAfter: number | undefined;
}

export interface SendFormatResult {
  readonly format: TelegramPayloadFormat;
  readonly ok: boolean;
  readonly messageId?: number;
  readonly error?: string;
}

export interface SendAllFormatsOptions {
  readonly token: string;
  readonly chatId: string;
  readonly delayMs?: number;
  readonly deleteMessages?: boolean;
}

export const TELEGRAM_FORMATS: readonly TelegramPayloadFormat[] = [
  'entities',
  'HTML',
  'MarkdownV2',
];

const MAX_MESSAGE_LENGTH = 4096;
const SEND_DELAY_MS = 1_100;
const MAX_RATE_LIMIT_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 15_000;

export function assertPayloadLength(
  text: string,
  format: TelegramPayloadFormat,
): void {
  if (text.length === 0 || text.length > MAX_MESSAGE_LENGTH) {
    throw new RangeError(
      `${format}: text must be 1-${MAX_MESSAGE_LENGTH} UTF-16 code units (got ${text.length})`,
    );
  }
}

export async function sendAllFormats(
  message: FormattedMessage,
  options: SendAllFormatsOptions,
): Promise<readonly SendFormatResult[]> {
  const results: SendFormatResult[] = [];

  for (const [index, format] of TELEGRAM_FORMATS.entries()) {
    if (index > 0) await sleep(options.delayMs ?? SEND_DELAY_MS);
    results.push(await sendOne(message, format, options));
  }

  return results;
}

async function sendOne(
  message: FormattedMessage,
  format: TelegramPayloadFormat,
  options: SendAllFormatsOptions,
): Promise<SendFormatResult> {
  const rendered = renderPayload(message, format);
  if (!rendered.ok) {
    console.error(`${format}: failed (${rendered.error})`);
    return { format, ok: false, error: rendered.error };
  }

  const call = await callTelegram(options.token, 'sendMessage', {
    chat_id: options.chatId,
    ...rendered.payload,
    link_preview_options: { is_disabled: true },
  });

  if (!call.ok || call.result === undefined) {
    const description = call.description ?? `HTTP ${call.status}`;
    console.error(`${format}: failed (${description})`);
    return { format, ok: false, error: description };
  }

  console.log(`${format}: sent message ${call.result.message_id}`);

  if (options.deleteMessages === true) {
    await deleteMessage(options.token, options.chatId, call.result.message_id);
  }

  return { format, ok: true, messageId: call.result.message_id };
}

function renderPayload(
  message: FormattedMessage,
  format: TelegramPayloadFormat,
):
  | { readonly ok: true; readonly payload: TelegramPayload }
  | { readonly ok: false; readonly error: string } {
  try {
    const payload = toTelegramPayload(message, format);
    assertPayloadLength(payload.text, format);
    return { ok: true, payload };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

async function callTelegram(
  botToken: string,
  method: string,
  body: Record<string, unknown>,
): Promise<TelegramCall> {
  for (let attempt = 0; ; attempt += 1) {
    const call = await requestTelegram(botToken, method, body);
    if (call.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) {
      return call;
    }

    const retryAfter = call.retryAfter ?? 1;
    console.warn(`${method}: rate limited, retrying in ${retryAfter}s`);
    await sleep((retryAfter + 0.5) * 1000);
  }
}

async function requestTelegram(
  botToken: string,
  method: string,
  body: Record<string, unknown>,
): Promise<TelegramCall> {
  try {
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

    return {
      ok: response.ok && result.ok,
      status: response.status,
      description: result.description,
      result: result.result,
      retryAfter: result.parameters?.retry_after,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      description: errorMessage(error),
      result: undefined,
      retryAfter: undefined,
    };
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
