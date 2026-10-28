import type { Content } from './content.js';
import { toNodes } from './content.js';
import type { FormattedMessage } from './message.js';
import { messageFromNodes } from './message.js';
import type { Node, Style } from './nodes.js';
import {
  concatNodes,
  containsNode,
  stripStyle,
  textLength,
  textNodes,
} from './nodes.js';
import type { DateTimeFormat, TelegramUser } from './types.js';

const STYLE_FORBIDDEN: ReadonlySet<Node['kind']> = new Set([
  'code',
  'pre',
  'quote',
]);
const LINK_FORBIDDEN: ReadonlySet<Node['kind']> = new Set([
  'link',
  'text_mention',
  'emoji',
  'date_time',
  'quote',
  'pre',
]);
const QUOTE_FORBIDDEN: ReadonlySet<Node['kind']> = new Set(['quote', 'pre']);
const LANGUAGE_PATTERN = /^[A-Za-z0-9_+#.-]+$/;
const DATE_TIME_FORMAT_PATTERN = /^(?:r|w?[dD]?[tT]?)$/;
const CUSTOM_EMOJI_ID_PATTERN = /^\d+$/;
const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: 'grapheme',
});

function buildNodes(content: readonly Content[]): Node[] {
  return concatNodes(content.map(toNodes));
}

function assertNonEmpty(nodes: readonly Node[], name: string): void {
  if (textLength(nodes) === 0) {
    throw new RangeError(`${name}() requires non-empty content`);
  }
}

function styleMessage(
  style: Style,
  name: string,
  content: readonly Content[],
): FormattedMessage {
  const nodes = buildNodes(content);
  assertNonEmpty(nodes, name);

  if (containsNode(nodes, STYLE_FORBIDDEN)) {
    throw new RangeError(
      `${name}() cannot contain code, pre, or blockquote content`,
    );
  }

  return messageFromNodes([
    { kind: 'style', style, children: stripStyle(nodes, style) },
  ]);
}

export function bold(...content: Content[]): FormattedMessage {
  return styleMessage('bold', 'bold', content);
}

export function italic(...content: Content[]): FormattedMessage {
  return styleMessage('italic', 'italic', content);
}

export function underline(...content: Content[]): FormattedMessage {
  return styleMessage('underline', 'underline', content);
}

export function strikethrough(...content: Content[]): FormattedMessage {
  return styleMessage('strikethrough', 'strikethrough', content);
}

export function spoiler(...content: Content[]): FormattedMessage {
  return styleMessage('spoiler', 'spoiler', content);
}

export function link(content: Content, url: string): FormattedMessage {
  return linkMessage(content, url, 'link');
}

function linkMessage(
  content: Content,
  url: string,
  name: string,
): FormattedMessage {
  const nodes = buildNodes([content]);
  assertNonEmpty(nodes, name);
  assertUrl(url, name);

  if (containsNode(nodes, LINK_FORBIDDEN)) {
    throw new RangeError(
      `${name}() cannot contain links, mentions, custom emoji, blockquotes, or pre-formatted code`,
    );
  }

  return messageFromNodes([{ kind: 'link', children: nodes, url }]);
}

export function mention(content: Content, userId: number): FormattedMessage;
export function mention(content: string, user: TelegramUser): FormattedMessage;
export function mention(
  content: Content | string,
  user: number | TelegramUser,
): FormattedMessage {
  if (typeof user === 'number') {
    assertUserId(user, 'mention');
    return linkMessage(content, `tg://user?id=${user}`, 'mention');
  }

  assertUser(user);
  if (typeof content !== 'string') {
    throw new TypeError(
      'mention() with a User object requires a plain string label; use a user id to format the label',
    );
  }
  if (content.length === 0) {
    throw new RangeError('mention() requires a non-empty label');
  }

  return messageFromNodes([
    { kind: 'text_mention', children: textNodes(content), user },
  ]);
}

function assertUserId(userId: number, name: string): void {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new RangeError(`${name}() userId must be a positive safe integer`);
  }
}

function assertUser(user: TelegramUser): void {
  if (
    typeof user !== 'object' ||
    user === null ||
    typeof user.id !== 'number' ||
    !Number.isSafeInteger(user.id) ||
    user.id <= 0 ||
    typeof user.is_bot !== 'boolean' ||
    typeof user.first_name !== 'string'
  ) {
    throw new TypeError(
      'mention() requires a valid Telegram User object with id, is_bot, and first_name',
    );
  }
}

export function emoji(
  fallback: string,
  customEmojiId: string,
): FormattedMessage {
  if (typeof fallback !== 'string' || !isSingleGrapheme(fallback)) {
    throw new RangeError('emoji() fallback must be exactly one emoji');
  }
  if (
    typeof customEmojiId !== 'string' ||
    !CUSTOM_EMOJI_ID_PATTERN.test(customEmojiId)
  ) {
    throw new RangeError(
      'emoji() customEmojiId must be a numeric string (custom emoji IDs exceed the safe integer range)',
    );
  }

  return messageFromNodes([
    { kind: 'emoji', value: fallback, id: customEmojiId },
  ]);
}

function isSingleGrapheme(value: string): boolean {
  return [...graphemeSegmenter.segment(value)].length === 1;
}

export function code(value: string): FormattedMessage {
  assertText(value, 'code');
  return messageFromNodes([{ kind: 'code', value }]);
}

export function dateTime(
  text: string,
  unixTime: number,
  format?: DateTimeFormat,
): FormattedMessage {
  assertText(text, 'dateTime');

  if (!Number.isSafeInteger(unixTime)) {
    throw new RangeError('dateTime() unixTime must be a safe integer');
  }
  if (
    format !== undefined &&
    !DATE_TIME_FORMAT_PATTERN.test(format)
  ) {
    throw new RangeError(
      'dateTime() format must match r|w?[dD]?[tT]?',
    );
  }

  return messageFromNodes([
    {
      kind: 'date_time',
      value: text,
      unixTime,
      ...(format === undefined ? {} : { format }),
    },
  ]);
}

export function pre(value: string, language?: string): FormattedMessage {
  assertText(value, 'pre');

  if (language === undefined) {
    return messageFromNodes([{ kind: 'pre', value }]);
  }

  return messageFromNodes([
    { kind: 'pre', value, language: assertLanguage(language) },
  ]);
}

function assertText(value: string, name: string): void {
  if (typeof value !== 'string') {
    throw new TypeError(`${name}() requires a string`);
  }
  if (value.length === 0) {
    throw new RangeError(`${name}() requires non-empty content`);
  }
}

function assertLanguage(language: string): string {
  if (
    typeof language !== 'string' ||
    !LANGUAGE_PATTERN.test(language)
  ) {
    throw new RangeError(
      'pre() language must contain only letters, digits, _, +, #, ., or -',
    );
  }
  return language;
}

export function quote(content: Content): FormattedMessage {
  return quoteMessage(content, false, 'quote');
}

export function expandableQuote(content: Content): FormattedMessage {
  return quoteMessage(content, true, 'expandableQuote');
}

function quoteMessage(
  content: Content,
  expandable: boolean,
  name: string,
): FormattedMessage {
  const nodes = buildNodes([content]);
  assertNonEmpty(nodes, name);

  if (containsNode(nodes, QUOTE_FORBIDDEN)) {
    throw new RangeError(
      `${name}() cannot contain blockquotes or pre-formatted code`,
    );
  }

  return messageFromNodes([{ kind: 'quote', children: nodes, expandable }]);
}

function assertUrl(url: string, name: string): void {
  if (typeof url !== 'string' || url.length === 0) {
    throw new TypeError(`${name}() requires a non-empty URL`);
  }
  if (/[\r\n]/.test(url)) {
    throw new RangeError(`${name}() URL must not contain line breaks`);
  }
}

export const b = bold;
export const i = italic;
export const u = underline;
export const s = strikethrough;
export const blockquote = quote;
export const expandableBlockquote = expandableQuote;
