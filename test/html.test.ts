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

  assert.equal(
    message.toHTML(),
    '<b>b</b> <i>i</i> <u>u</u> <s>s</s> <tg-spoiler>p</tg-spoiler>',
  );
});

test('keeps nested styles nested', () => {
  const message = fmt`${bold(italic(underline('x')))}`;

  assert.equal(message.toHTML(), '<b><i><u>x</u></i></b>');
});

test('escapes user-controlled text', () => {
  const message = fmt`${bold('<script>alert("x") & 1</script>')}`;

  assert.equal(
    message.toHTML(),
    '<b>&lt;script&gt;alert("x") &amp; 1&lt;/script&gt;</b>',
  );
});

test('escapes link attributes', () => {
  const message = link('docs', 'https://example.com/?a=1&b="q"');

  assert.equal(
    message.toHTML(),
    '<a href="https://example.com/?a=1&amp;b=&quot;q&quot;">docs</a>',
  );
});

test('renders mentions by user id and text_mention', () => {
  assert.equal(
    mention('Alice', 123).toHTML(),
    '<a href="tg://user?id=123">Alice</a>',
  );
  assert.equal(
    mention('Alice', user).toHTML(),
    '<a href="tg://user?id=123">Alice</a>',
  );
});

test('renders custom emoji with a fallback', () => {
  assert.equal(
    emoji('👍', '5368324170671202286').toHTML(),
    '<tg-emoji emoji-id="5368324170671202286">👍</tg-emoji>',
  );
});

test('renders inline code and code blocks', () => {
  assert.equal(code('a`b\\c').toHTML(), '<code>a`b\\c</code>');
  assert.equal(
    pre('const x = 1;', 'ts').toHTML(),
    '<pre><code class="language-ts">const x = 1;</code></pre>',
  );
  assert.equal(pre('<x>').toHTML(), '<pre>&lt;x&gt;</pre>');
});

test('renders blockquotes and expandable blockquotes', () => {
  assert.equal(
    quote('line 1\nline 2').toHTML(),
    '<blockquote>line 1\nline 2</blockquote>',
  );
  assert.equal(
    expandableQuote('more').toHTML(),
    '<blockquote expandable>more</blockquote>',
  );
});

test('renders a complete message', () => {
  const message = fmt`Hello ${bold('Alice')}!\n${link('docs', 'https://example.com')}`;

  assert.equal(
    message.toHTML(),
    'Hello <b>Alice</b>!\n<a href="https://example.com">docs</a>',
  );
});
