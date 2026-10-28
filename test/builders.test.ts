import assert from 'node:assert/strict';
import test from 'node:test';
import {
  b,
  blockquote,
  bold,
  code,
  emoji,
  expandableBlockquote,
  expandableQuote,
  fmt,
  i,
  italic,
  join,
  link,
  mention,
  pre,
  quote,
  s,
  u,
  type TelegramUser,
} from '../src/index.js';

const user: TelegramUser = {
  id: 123,
  is_bot: false,
  first_name: 'Alice',
};

test('join combines fragments with a plain separator', () => {
  const message = join([bold('a'), italic('b')], ' | ');

  assert.equal(message.text, 'a | b');
  assert.deepEqual(message.entities, [
    { type: 'bold', offset: 0, length: 1 },
    { type: 'italic', offset: 4, length: 1 },
  ]);
  assert.equal(message.toHTML(), '<b>a</b> | <i>b</i>');
  assert.equal(message.toMarkdownV2(), '*a* \\| _b_');
});

test('join handles empty and single-item lists', () => {
  assert.equal(join([]).text, '');
  assert.equal(join(['a']).text, 'a');
  assert.equal(join(['a', 'b', 'c'], '\n').text, 'a\nb\nc');
});

test('join accepts a formatted separator', () => {
  const message = join(['a', 'b'], bold(' | '));

  assert.equal(message.text, 'a | b');
  assert.deepEqual(message.entities, [
    { type: 'bold', offset: 1, length: 3 },
  ]);
});

test('fmt accepts nested arrays of content', () => {
  const message = fmt`x ${[bold('a'), [' ', italic('b')]]}`;

  assert.equal(message.text, 'x a b');
  assert.deepEqual(message.entities, [
    { type: 'bold', offset: 2, length: 1 },
    { type: 'italic', offset: 4, length: 1 },
  ]);
});

test('fmt accepts numbers and rejects non-finite numbers', () => {
  assert.equal(fmt`n=${42}`.text, 'n=42');
  assert.equal(fmt`${-1.5}`.text, '-1.5');

  assert.throws(() => fmt`${Number.NaN}`, RangeError);
  assert.throws(() => fmt`${Number.POSITIVE_INFINITY}`, RangeError);
  assert.throws(() => fmt`${Number.NEGATIVE_INFINITY}`, RangeError);
});

test('fmt rejects values that are not text, numbers, messages, or arrays', () => {
  assert.throws(() => fmt`${null}`, TypeError);
  assert.throws(() => fmt`${undefined}`, TypeError);
  assert.throws(() => fmt`${true}`, TypeError);
  assert.throws(() => fmt`${1n}`, TypeError);
  assert.throws(() => fmt`${{}}`, TypeError);
});

test('fmt only works as a tagged template', () => {
  const callable = fmt as unknown as (strings: string[]) => unknown;

  assert.throws(
    () => callable('not a template' as unknown as string[]),
    TypeError,
  );
  assert.throws(() => callable(['a', 'b']), TypeError);
});

test('short aliases match their long names', () => {
  assert.equal(b('x').toHTML(), '<b>x</b>');
  assert.equal(i('x').toHTML(), '<i>x</i>');
  assert.equal(u('x').toHTML(), '<u>x</u>');
  assert.equal(s('x').toHTML(), '<s>x</s>');
  assert.equal(blockquote('x').toHTML(), quote('x').toHTML());
  assert.equal(
    expandableBlockquote('x').toHTML(),
    expandableQuote('x').toHTML(),
  );
});

test('empty content is rejected for every container', () => {
  assert.throws(() => bold(), RangeError);
  assert.throws(() => italic(''), RangeError);
  assert.throws(() => code(''), RangeError);
  assert.throws(() => pre(''), RangeError);
  assert.throws(() => link('', 'https://example.com'), RangeError);
  assert.throws(() => quote(''), RangeError);
  assert.throws(() => expandableQuote(''), RangeError);
});

test('styles reject code, pre, and blockquotes', () => {
  assert.throws(() => bold(code('x')), RangeError);
  assert.throws(() => bold(pre('x')), RangeError);
  assert.throws(() => bold(quote('x')), RangeError);
  assert.throws(() => italic(link(code('x'), 'https://example.com')), RangeError);
});

test('links reject nested links, mentions, emoji, quotes, and pre', () => {
  assert.throws(() => link(link('x', 'a'), 'b'), RangeError);
  assert.throws(() => link(mention('x', 1), 'url'), RangeError);
  assert.throws(() => link(emoji('👍', '1'), 'url'), RangeError);
  assert.throws(() => link(quote('x'), 'url'), RangeError);
  assert.throws(() => link(pre('x'), 'url'), RangeError);
});

test('links and styles can contain inline code', () => {
  assert.equal(
    link(code('x'), 'https://example.com').toHTML(),
    '<a href="https://example.com"><code>x</code></a>',
  );
});

test('links accept formatted labels and styles accept links', () => {
  assert.equal(
    link(bold('docs'), 'https://example.com').toHTML(),
    '<a href="https://example.com"><b>docs</b></a>',
  );
  assert.equal(
    bold(link('docs', 'https://example.com')).toHTML(),
    '<b><a href="https://example.com">docs</a></b>',
  );
});

test('links require a non-empty URL without line breaks', () => {
  assert.throws(() => link('x', ''), TypeError);
  assert.throws(() => link('x', 'a\nb'), RangeError);
});

test('blockquotes reject nested blockquotes and pre-formatted code', () => {
  assert.throws(() => quote(quote('x')), RangeError);
  assert.throws(() => quote(pre('x')), RangeError);
  assert.equal(quote(code('x')).toHTML(), '<blockquote><code>x</code></blockquote>');
});

test('mention validates user ids and User objects', () => {
  assert.throws(() => mention('x', 0), RangeError);
  assert.throws(() => mention('x', -1), RangeError);
  assert.throws(() => mention('x', 1.5), RangeError);
  assert.throws(
    () => mention(bold('x') as unknown as string, user),
    TypeError,
  );
  assert.throws(() => mention('x', { id: 1 } as TelegramUser), TypeError);

  assert.equal(
    mention('x', { id: 1, is_bot: false, first_name: 'A' }).toHTML(),
    '<a href="tg://user?id=1">x</a>',
  );
});

test('custom emoji validates the fallback and numeric id', () => {
  assert.throws(() => emoji('', '1'), RangeError);
  assert.throws(() => emoji('two🔥', '1'), RangeError);
  assert.throws(() => emoji('👍', 'abc'), RangeError);
  assert.throws(() => emoji('👍', '1.5'), RangeError);
  assert.throws(() => emoji('👍', 123 as unknown as string), RangeError);

  assert.equal(
    emoji('👍', '1').toHTML(),
    '<tg-emoji emoji-id="1">👍</tg-emoji>',
  );
});

test('pre validates the language token', () => {
  assert.throws(() => pre('x', ''), RangeError);
  assert.throws(() => pre('x', 'ts\n'), RangeError);
  assert.throws(() => pre('x', 'not a language'), RangeError);

  assert.equal(
    pre('x', 'c++').toMarkdownV2(),
    '```c++\nx\n```',
  );
});

test('code requires a string', () => {
  assert.throws(() => code(42 as unknown as string), TypeError);
});
