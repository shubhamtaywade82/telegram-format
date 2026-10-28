import type { FormattedMessage } from './message.js';
import type { MessageEntity } from './types.js';

/** Parse modes supported by the Telegram Bot API. */
export type TelegramParseMode = 'HTML' | 'MarkdownV2';

/** Output formats accepted by `toTelegramPayload`. */
export type TelegramPayloadFormat = 'entities' | TelegramParseMode;

/** Payload using native entities; no `parse_mode` is needed. */
export interface TelegramEntitiesPayload {
  text: string;
  entities: MessageEntity[];
}

/** Payload using a Telegram parse mode. */
export interface TelegramParsedPayload {
  text: string;
  parse_mode: TelegramParseMode;
}

export type TelegramPayload = TelegramEntitiesPayload | TelegramParsedPayload;

export function toTelegramPayload(
  message: FormattedMessage,
): TelegramEntitiesPayload;
export function toTelegramPayload(
  message: FormattedMessage,
  format: 'entities',
): TelegramEntitiesPayload;
export function toTelegramPayload(
  message: FormattedMessage,
  format: TelegramParseMode,
): TelegramParsedPayload;
export function toTelegramPayload(
  message: FormattedMessage,
  format: TelegramPayloadFormat,
): TelegramPayload;
export function toTelegramPayload(
  message: FormattedMessage,
  format: TelegramPayloadFormat = 'entities',
): TelegramPayload {
  switch (format) {
    case 'entities':
      return { text: message.text, entities: message.entities };
    case 'HTML':
      return { text: message.toHTML(), parse_mode: 'HTML' };
    case 'MarkdownV2':
      return { text: message.toMarkdownV2(), parse_mode: 'MarkdownV2' };
    default:
      throw new RangeError(`Unsupported Telegram format: ${String(format)}`);
  }
}
