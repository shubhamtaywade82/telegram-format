import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bold,
  code,
  emoji,
  expandableQuote,
  fmt,
  italic,
  link,
  mention,
  pre,
  quote,
  spoiler,
  strikethrough,
  underline,
  type TelegramUser,
} from '../src/index.js';

const user: TelegramUser = {
  id: 123,
  is_bot: false,
  first_name: 'Alice',
};

test('renders all inline styles', () => {
  const message = fmt`${bold('b')} ${italic('i')} ${underline('u')} ${strikethrough('s')} ${spoiler('p')}`;

  assert.equal(message.toMarkdownV2(), '*b* _i_ __u__ ~s~ ||p||');
});

test('escapes literal text', () => {
  const message = fmt`Use a_b*c!`;

  assert.equal(message.toMarkdownV2(), 'Use a\\_b\\*c\\!');
});

test('keeps nested bold and italic unambiguous', () => {
  assert.equal(
    fmt`${bold(italic('x'))}`.toMarkdownV2(),
    '*_x_*',
  );
});

test('separates adjacent italic and underline markers', () => {
  assert.equal(
    underline(italic('x')).toMarkdownV2(),
    '__**_x_**__',
  );
  assert.equal(
    italic(underline('x')).toMarkdownV2(),
    '_**__x__**_',
  );
});

test('renders inline code and escapes backticks and backslashes', () => {
  assert.equal(
    code('a`b\\c').toMarkdownV2(),
    '`a\\`b\\\\c`',
  );
});

test('renders code blocks with and without a language', () => {
  assert.equal(
    pre('const x = 1;', 'ts').toMarkdownV2(),
    '```ts\nconst x = 1;\n```',
  );
  assert.equal(
    pre('const x = 1;').toMarkdownV2(),
    '```\nconst x = 1;\n```',
  );
});

test('renders links and escapes the URL', () => {
  assert.equal(
    link('docs', 'https://example.com/a)b\\c').toMarkdownV2(),
    '[docs](https://example.com/a\\)b\\\\c)',
  );
  assert.equal(
    link('a_b', 'https://example.com').toMarkdownV2(),
    '[a\\_b](https://example.com)',
  );
});

test('renders mentions by user id and text_mention', () => {
  assert.equal(
    mention('Alice', 123).toMarkdownV2(),
    '[Alice](tg://user?id=123)',
  );
  assert.equal(
    mention('Alice', user).toMarkdownV2(),
    '[Alice](tg://user?id=123)',
  );
});

test('renders custom emoji', () => {
  assert.equal(
    emoji('👍', '5368324170671202286').toMarkdownV2(),
    '![👍](tg://emoji?id=5368324170671202286)',
  );
});

test('renders blockquotes', () => {
  assert.equal(
    quote('line 1\nline 2').toMarkdownV2(),
    '>line 1\n>line 2',
  );
  assert.equal(
    expandableQuote('line 1\nline 2').toMarkdownV2(),
    '**>line 1\n>line 2||',
  );
});

test('escapes blockquote content', () => {
  assert.equal(quote('Hello!').toMarkdownV2(), '>Hello\\!');
});

test('put block elements on their own lines', () => {
  assert.equal(
    fmt`Before ${pre('x')} after`.toMarkdownV2(),
    'Before \n```\nx\n```\n after',
  );
  assert.equal(
    fmt`Before ${quote('q')} after`.toMarkdownV2(),
    'Before \n>q\n after',
  );
});

test('do not add duplicate newlines around block elements', () => {
  assert.equal(
    fmt`Before\n${pre('x')}\nAfter`.toMarkdownV2(),
    'Before\n```\nx\n```\nAfter',
  );
  assert.equal(
    fmt`Before\n${quote('q')}\nAfter`.toMarkdownV2(),
    'Before\n>q\nAfter',
  );
});

test('renders a complete message', () => {
  const message = fmt`Hello ${bold('Alice')}!\n${link('docs', 'https://example.com')}`;

  assert.equal(
    message.toMarkdownV2(),
    'Hello *Alice*\\!\n[docs](https://example.com)',
  );
});
