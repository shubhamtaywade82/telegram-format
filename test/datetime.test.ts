import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bold,
  dateTime,
  fmt,
  link,
  quote,
  type DateTimeFormat,
} from '../src/index.js';

test('dateTime produces date_time entities with and without a format', () => {
  const message = fmt`${dateTime('tomorrow 22:45', 1647531900, 'wDT')} ${dateTime('now', 1647531900)}`;

  assert.equal(message.text, 'tomorrow 22:45 now');
  assert.deepEqual(message.entities, [
    {
      type: 'date_time',
      offset: 0,
      length: 14,
      unix_time: 1647531900,
      date_time_format: 'wDT',
    },
    {
      type: 'date_time',
      offset: 15,
      length: 3,
      unix_time: 1647531900,
    },
  ]);
});

test('dateTime renders the Telegram HTML tag', () => {
  assert.equal(
    dateTime('22:45 tomorrow', 1647531900, 'wDT').toHTML(),
    '<tg-time unix="1647531900" format="wDT">22:45 tomorrow</tg-time>',
  );
  assert.equal(
    dateTime('now', 1647531900).toHTML(),
    '<tg-time unix="1647531900">now</tg-time>',
  );
  assert.equal(
    dateTime('<now>', 0).toHTML(),
    '<tg-time unix="0">&lt;now&gt;</tg-time>',
  );
});

test('dateTime renders the MarkdownV2 time link and escapes its label', () => {
  assert.equal(
    dateTime('22:45 tomorrow', 1647531900, 'wDT').toMarkdownV2(),
    '![22:45 tomorrow](tg://time?unix=1647531900&format=wDT)',
  );
  assert.equal(
    dateTime('now', 1647531900).toMarkdownV2(),
    '![now](tg://time?unix=1647531900)',
  );
  assert.equal(
    dateTime('a!b', 0).toMarkdownV2(),
    '![a\\!b](tg://time?unix=0)',
  );
});

test('dateTime accepts every documented format', () => {
  const formats: DateTimeFormat[] = [
    '',
    'r',
    'w',
    'd',
    'D',
    't',
    'T',
    'wDT',
    'wd',
    'wt',
    'DT',
  ];

  for (const format of formats) {
    assert.equal(dateTime('x', 0, format).entities.length, 1);
  }
});

test('dateTime rejects invalid input', () => {
  assert.throws(() => dateTime('', 0), RangeError);
  assert.throws(() => dateTime('x', 1.5), RangeError);
  assert.throws(() => dateTime('x', Number.MAX_SAFE_INTEGER + 1), RangeError);
  assert.throws(
    () => dateTime('x', 0, 'rw' as DateTimeFormat),
    RangeError,
  );
  assert.throws(
    () => dateTime('x', 0, 'nope' as DateTimeFormat),
    RangeError,
  );
});

test('dateTime composes with styles and quotes but not links', () => {
  const time = dateTime('now', 0);

  assert.equal(
    bold(time).toHTML(),
    '<b><tg-time unix="0">now</tg-time></b>',
  );
  assert.equal(
    quote(time).toHTML(),
    '<blockquote><tg-time unix="0">now</tg-time></blockquote>',
  );
  assert.throws(() => link(time, 'https://example.com'), RangeError);
});
