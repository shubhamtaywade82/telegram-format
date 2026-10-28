import assert from 'node:assert/strict';
import test from 'node:test';
import { toTelegramPayload } from '../src/index.js';
import { buildAdvancedMessage } from '../scripts/advanced-message.js';

test('advanced live message covers the full entity set', () => {
  const message = buildAdvancedMessage();
  const types = new Set<string>(
    message.entities.map((entity) => entity.type),
  );
  const expected = [
    'bold',
    'italic',
    'underline',
    'strikethrough',
    'spoiler',
    'text_link',
    'code',
    'pre',
    'blockquote',
    'expandable_blockquote',
    'date_time',
  ];

  for (const type of expected) {
    assert.ok(types.has(type), `missing ${type} entity`);
  }
});

test('advanced live message keeps literal text intact', () => {
  const { text } = buildAdvancedMessage();

  assert.ok(
    text.includes(
      'Escaping: _ * [ ] ( ) ~ ` > # + - = | { } . ! \\ < & "',
    ),
  );
  assert.ok(text.includes('five styles'));
  assert.ok(text.includes('👍🏽 👨‍👩‍👧‍👦'));
  assert.ok(text.includes('Link with (parens) & bold'));
  assert.ok(text.includes('a`b\\c'));
  assert.ok(text.includes('const path = "C:\\tmp";'));
});

test('advanced live message renders safe HTML', () => {
  const html = buildAdvancedMessage().toHTML();

  assert.ok(html.includes('&lt;b&gt;literal&lt;/b&gt; &amp; "quotes"'));
  assert.ok(
    html.includes(
      'href="https://example.com/path_(x)?a=1&amp;b=2"',
    ),
  );
  assert.ok(
    html.includes(
      '<b><i><u><s><tg-spoiler>five styles</tg-spoiler></s></u></i></b>',
    ),
  );
  assert.ok(html.includes('<blockquote expandable>'));
  assert.ok(html.includes('<tg-time unix="1647531900" format="wDT">'));
});

test('advanced live message renders unambiguous MarkdownV2', () => {
  const markdown = buildAdvancedMessage().toMarkdownV2();

  assert.ok(
    markdown.includes('Nested: *_**__~||five styles||~__**_*'),
  );
  assert.ok(
    markdown.includes('Adjacent: _italic_**__underline__'),
  );
  assert.ok(
    markdown.includes(
      '[*Link with \\(parens\\) & bold*](https://example.com/path_(x\\)?a=1&b=2)',
    ),
  );
  assert.ok(markdown.includes('`a\\`b\\\\c`'));
  assert.ok(markdown.includes('**>Expandable quote content'));
  assert.ok(markdown.includes('expandable quote\\.||'));
  assert.ok(markdown.includes('(tg://time?unix='));
  assert.ok(markdown.includes('&format=wDT)'));
});

test('advanced live message fits every Telegram payload', () => {
  const message = buildAdvancedMessage();

  for (const format of ['entities', 'HTML', 'MarkdownV2'] as const) {
    const payload = toTelegramPayload(message, format);

    assert.ok(payload.text.length > 0);
    assert.ok(payload.text.length <= 4096);
  }
});
