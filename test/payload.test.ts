import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bold,
  concat,
  fmt,
  join,
  type FormattedMessage,
} from '../src/index.js';
import {
  toTelegramPayload,
  type TelegramEntitiesPayload,
  type TelegramParsedPayload,
  type TelegramPayload,
  type TelegramPayloadFormat,
} from '../src/index.js';

test('concat joins content without separators', () => {
  const message = concat(bold('a'), ' ', 1, ['!', bold('b')]);

  assert.equal(message.text, 'a 1!b');
  assert.deepEqual(message.entities, [
    { type: 'bold', offset: 0, length: 1 },
    { type: 'bold', offset: 4, length: 1 },
  ]);
  assert.equal(concat().text, '');
});

test('concat matches join with an empty separator', () => {
  const parts = [fmt`one ${bold('two')}`, ' ', fmt`three`];

  assert.deepEqual(concat(...parts).entities, join(parts, '').entities);
  assert.equal(concat(...parts).text, join(parts, '').text);
});

test('toTelegramPayload defaults to native entities', () => {
  const message = fmt`Hi ${bold('there')} & <you>`;
  const payload: TelegramEntitiesPayload = toTelegramPayload(message);

  assert.deepEqual(payload, {
    text: message.text,
    entities: message.entities,
  });
  assert.equal('parse_mode' in payload, false);
  assert.deepEqual(toTelegramPayload(message, 'entities'), payload);
});

test('toTelegramPayload renders HTML and MarkdownV2', () => {
  const message = fmt`Hi ${bold('there')}`;

  const html: TelegramParsedPayload = toTelegramPayload(message, 'HTML');
  assert.deepEqual(html, {
    text: message.toHTML(),
    parse_mode: 'HTML',
  });

  const markdown: TelegramParsedPayload = toTelegramPayload(
    message,
    'MarkdownV2',
  );
  assert.deepEqual(markdown, {
    text: message.toMarkdownV2(),
    parse_mode: 'MarkdownV2',
  });
});

test('toTelegramPayload supports a runtime format variable', () => {
  const message: FormattedMessage = fmt`Hi ${bold('there')}`;
  const format: TelegramPayloadFormat = 'HTML';
  const payload: TelegramPayload = toTelegramPayload(message, format);

  assert.equal(payload.text, message.toHTML());
});

test('toTelegramPayload rejects unknown formats at runtime', () => {
  assert.throws(
    () => toTelegramPayload(fmt`x`, 'Markdown' as TelegramPayloadFormat),
    RangeError,
  );
});
