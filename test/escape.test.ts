import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeHtml, escapeMarkdownV2 } from '../src/index.js';

test('escapeHtml escapes the three characters Telegram requires', () => {
  assert.equal(
    escapeHtml('<script>alert("x") & 1</script>'),
    '&lt;script&gt;alert("x") &amp; 1&lt;/script&gt;',
  );
});

test('escapeMarkdownV2 escapes every reserved character', () => {
  const reserved = [
    '_',
    '*',
    '[',
    ']',
    '(',
    ')',
    '~',
    '`',
    '>',
    '#',
    '+',
    '-',
    '=',
    '|',
    '{',
    '}',
    '.',
    '!',
  ];

  for (const character of reserved) {
    assert.equal(escapeMarkdownV2(character), `\\${character}`);
  }

  assert.equal(escapeMarkdownV2('\\'), '\\\\');
});

test('escapeMarkdownV2 leaves ordinary text and emoji alone', () => {
  assert.equal(escapeMarkdownV2('Hello мир 👍'), 'Hello мир 👍');
  assert.equal(escapeMarkdownV2('a_b*c'), 'a\\_b\\*c');
});
