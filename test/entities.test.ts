import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bold,
  code,
  emoji,
  fmt,
  italic,
  link,
  mention,
  pre,
  quote,
  underline,
  type TelegramUser,
} from '../src/index.js';

const user: TelegramUser = {
  id: 123,
  is_bot: false,
  first_name: 'Alice',
  username: 'alice',
};

test('fmt produces plain text and native entities', () => {
  const message = fmt`Hello ${bold('world')}!`;

  assert.equal(message.text, 'Hello world!');
  assert.deepEqual(message.entities, [
    { type: 'bold', offset: 6, length: 5 },
  ]);
  assert.equal(message.toString(), 'Hello world!');
});

test('nested entities are emitted outer-first', () => {
  const message = fmt`${bold(italic(underline('x')))}`;

  assert.equal(message.text, 'x');
  assert.deepEqual(message.entities, [
    { type: 'bold', offset: 0, length: 1 },
    { type: 'italic', offset: 0, length: 1 },
    { type: 'underline', offset: 0, length: 1 },
  ]);
});

test('offsets use UTF-16 code units, matching Telegram', () => {
  const message = fmt`${bold('👍')} ${italic('👨‍👩‍👧‍👦')}`;

  assert.equal(message.text, '👍 👨‍👩‍👧‍👦');
  assert.deepEqual(message.entities, [
    { type: 'bold', offset: 0, length: 2 },
    { type: 'italic', offset: 3, length: 11 },
  ]);
});

test('adjacent and nested identical styles are merged', () => {
  const adjacent = fmt`${bold('a')}${bold('b')}`;
  assert.equal(adjacent.text, 'ab');
  assert.deepEqual(adjacent.entities, [
    { type: 'bold', offset: 0, length: 2 },
  ]);

  const nested = bold(bold('x'));
  assert.equal(nested.text, 'x');
  assert.deepEqual(nested.entities, [
    { type: 'bold', offset: 0, length: 1 },
  ]);
});

test('code, pre, links, mentions, and custom emoji produce correct entities', () => {
  const message = fmt`${code('npm i')} ${pre('const x = 1;', 'ts')} ${link('docs', 'https://example.com')} ${mention('Alice', user)} ${emoji('👍', '5368324170671202286')}`;

  assert.equal(
    message.text,
    'npm i const x = 1; docs Alice 👍',
  );
  assert.deepEqual(message.entities, [
    { type: 'code', offset: 0, length: 5 },
    { type: 'pre', offset: 6, length: 12, language: 'ts' },
    { type: 'text_link', offset: 19, length: 4, url: 'https://example.com' },
    {
      type: 'text_mention',
      offset: 24,
      length: 5,
      user,
    },
    {
      type: 'custom_emoji',
      offset: 30,
      length: 2,
      custom_emoji_id: '5368324170671202286',
    },
  ]);
});

test('mention by user id produces a text_link entity', () => {
  const message = fmt`${mention('Alice', 123)}`;

  assert.deepEqual(message.entities, [
    {
      type: 'text_link',
      offset: 0,
      length: 5,
      url: 'tg://user?id=123',
    },
  ]);
});

test('a formatted message can be interpolated without losing entities', () => {
  const name = bold('Alice');
  const message = fmt`Hi ${name}, ${italic('welcome')}`;

  assert.equal(message.text, 'Hi Alice, welcome');
  assert.deepEqual(message.entities, [
    { type: 'bold', offset: 3, length: 5 },
    { type: 'italic', offset: 10, length: 7 },
  ]);
});

test('quote entities are emitted with the right type', () => {
  const message = fmt`${quote('one\ntwo')} ${pre('x')}`;

  assert.equal(message.text, 'one\ntwo x');
  assert.deepEqual(message.entities, [
    { type: 'blockquote', offset: 0, length: 7 },
    { type: 'pre', offset: 8, length: 1 },
  ]);
});
