import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bold,
  code,
  concat,
  dateTime,
  emoji,
  fmt,
  italic,
  join,
  link,
  pre,
  quote,
  spoiler,
  strikethrough,
  underline,
  type FormattedMessage,
  type MessageEntity,
} from '../src/index.js';
import { toTelegramPayload } from '../src/index.js';

const ALPHABET = [
  ...'abZ09 _*[]()~`>#+-=|{}.!\\<>&"\'',
  '\n',
  '👍',
  '👨‍👩‍👧‍👦',
  'é',
  '中',
  '🙂',
];
const INLINE_ALPHABET = ALPHABET.filter((value) => value !== '\n');

function random(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomText(
  next: () => number,
  alphabet: readonly string[] = ALPHABET,
): string {
  const length = 1 + Math.floor(next() * 6);
  let text = '';

  for (let index = 0; index < length; index += 1) {
    text += alphabet[Math.floor(next() * alphabet.length)]!;
  }

  return text;
}

function randomMessage(next: () => number): FormattedMessage {
  const text = randomText(next);
  const inline = randomText(next, INLINE_ALPHABET);

  switch (Math.floor(next() * 9)) {
    case 0:
      return fmt`${text} ${bold(italic(inline))}`;
    case 1:
      return link(bold(inline), `https://example.com/?q=${encodeURIComponent(inline)}`);
    case 2:
      return pre(text, 'ts');
    case 3:
      return quote(fmt`${text} ${italic(inline)}`);
    case 4:
      return code(inline);
    case 5:
      return dateTime(inline, 1647531900, 'wDT');
    case 6:
      return emoji('👍', '5368324170671202286');
    case 7:
      return fmt`${underline(inline)} ${strikethrough(inline)}`;
    default:
      return spoiler(bold(text));
  }
}

function assertEntityBounds(
  text: string,
  entity: MessageEntity,
): void {
  assert.ok(Number.isInteger(entity.offset), 'offset must be an integer');
  assert.ok(Number.isInteger(entity.length), 'length must be an integer');
  assert.ok(entity.offset >= 0, 'offset must be non-negative');
  assert.ok(entity.length > 0, 'length must be positive');
  assert.ok(
    entity.offset + entity.length <= text.length,
    'entity must stay inside the message',
  );
  assertEntityFields(entity);
}

function assertEntityFields(entity: MessageEntity): void {
  switch (entity.type) {
    case 'pre':
      if (entity.language !== undefined) {
        assert.match(entity.language, /^[A-Za-z0-9_+#.-]+$/);
      }
      break;
    case 'text_link':
      assert.ok(entity.url.length > 0);
      break;
    case 'custom_emoji':
      assert.match(entity.custom_emoji_id, /^\d+$/);
      break;
    case 'date_time':
      assert.ok(Number.isSafeInteger(entity.unix_time));
      break;
    default:
      break;
  }
}

function assertValidEntities(message: FormattedMessage): void {
  const { text, entities } = message;

  for (const entity of entities) {
    assertEntityBounds(text, entity);
  }

  for (let left = 0; left < entities.length; left += 1) {
    for (let right = left + 1; right < entities.length; right += 1) {
      const a = entities[left]!;
      const b = entities[right]!;
      const disjoint =
        a.offset + a.length <= b.offset ||
        b.offset + b.length <= a.offset;
      const aContainsB =
        a.offset <= b.offset &&
        a.offset + a.length >= b.offset + b.length;
      const bContainsA =
        b.offset <= a.offset &&
        b.offset + b.length >= a.offset + a.length;

      assert.ok(
        disjoint || aContainsB || bContainsA,
        `entities ${a.type} and ${b.type} must be disjoint or nested`,
      );
    }
  }
}

test('deterministic fuzz: entities stay valid and renderers agree', () => {
  for (let seed = 1; seed <= 150; seed += 1) {
    const next = random(seed);
    const parts: FormattedMessage[] = [];

    for (let index = 0; index < 5; index += 1) {
      parts.push(randomMessage(next));
    }

    const base = concat(...parts);
    const alternatives = [join(parts, ''), fmt`${parts}`];

    assertValidEntities(base);
    assert.equal(
      toTelegramPayload(base, 'entities').text,
      base.text,
    );

    for (const alternative of alternatives) {
      assert.equal(alternative.text, base.text);
      assert.deepEqual(alternative.entities, base.entities);
      assert.equal(alternative.toHTML(), base.toHTML());
      assert.equal(alternative.toMarkdownV2(), base.toMarkdownV2());
    }

    assert.equal(typeof base.toHTML(), 'string');
    assert.equal(typeof base.toMarkdownV2(), 'string');
  }
});
