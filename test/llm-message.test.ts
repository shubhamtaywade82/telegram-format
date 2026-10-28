import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advancedMessageSpecSchema,
  buildLlmMessage,
  type AdvancedMessageSpec,
} from '../scripts/llm-message.js';
import {
  createSendAdvancedMessageTool,
  type SendOutcome,
} from '../scripts/llm-tool.js';
import { toTelegramPayload } from '../src/index.js';

const spec: AdvancedMessageSpec = {
  title: 'LLM tool-call formatting check',
  intro:
    'Escaping torture: _ * [ ] ( ) ~ ` > # + - = | { } . ! \\ < & and an emoji 👍🏽.',
  nested_text: 'five styles',
  link_label: 'Link with (parens) & bold',
  inline_code: 'a`b\\c',
  code: 'const re = /`/g;\nconst path = "C:\\\\tmp";',
  code_language: 'ts',
  quote: 'Quoted heading\nwith italic, a link, and npm test.',
  expandable_quote: 'This quote expands when tapped.',
};

test('LLM schema validates model arguments', () => {
  const parsed = advancedMessageSpecSchema.parse(spec);

  assert.equal(parsed.title, spec.title);
  assert.equal(
    advancedMessageSpecSchema.parse({
      title: spec.title,
      intro: spec.intro,
      nested_text: spec.nested_text,
      link_label: spec.link_label,
      inline_code: spec.inline_code,
      code: spec.code,
      quote: spec.quote,
      expandable_quote: spec.expandable_quote,
    }).code_language,
    'ts',
  );
  assert.throws(() =>
    advancedMessageSpecSchema.parse({
      ...spec,
      code_language: 'bad`language',
    }),
  );
  assert.throws(() =>
    advancedMessageSpecSchema.parse({
      ...spec,
      nested_text: 'line\nbreak',
    }),
  );
  assert.throws(() =>
    advancedMessageSpecSchema.parse({
      ...spec,
      nested_text: 'emoji 😀',
    }),
  );
});

test('LLM message builder covers the advanced entity set', () => {
  const message = buildLlmMessage(spec);
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

test('LLM message pads short expandable quotes to six lines', () => {
  const message = buildLlmMessage(spec);
  const entity = message.entities.find(
    (candidate) => candidate.type === 'expandable_blockquote',
  );

  assert.ok(entity);
  const quoteText = message.text.slice(
    entity.offset,
    entity.offset + entity.length,
  );

  assert.ok(quoteText.split('\n').length >= 6);
});

test('LLM message normalizes literal newline escapes in prose', () => {
  const message = buildLlmMessage({
    ...spec,
    link_label: 'Docs &amp; examples&nbsp;',
    quote: 'Quote line 1<br>Quote line 2',
    expandable_quote:
      'Line 1\\nLine 2\\nLine 3\\nLine 4\\nLine 5\\nLine 6',
  });
  const blockquote = message.entities.find(
    (candidate) => candidate.type === 'blockquote',
  );
  const expandable = message.entities.find(
    (candidate) => candidate.type === 'expandable_blockquote',
  );

  assert.ok(blockquote);
  assert.ok(expandable);
  const quoteText = message.text.slice(
    blockquote.offset,
    blockquote.offset + blockquote.length,
  );
  const expandableText = message.text.slice(
    expandable.offset,
    expandable.offset + expandable.length,
  );

  assert.match(message.text, /Docs & examples/);
  assert.ok(quoteText.includes('Quote line 1\nQuote line 2'));
  assert.equal(expandableText.split('\n').length, 6);
  assert.ok(!expandableText.includes('\\n'));
});

test('LLM message keeps long expandable quotes intact', () => {
  const expandable_quote = Array.from(
    { length: 6 },
    (_, index) => `Expandable line ${index + 1}`,
  ).join('\n');
  const message = buildLlmMessage({ ...spec, expandable_quote });
  const entity = message.entities.find(
    (candidate) => candidate.type === 'expandable_blockquote',
  );

  assert.ok(entity);
  const quoteText = message.text.slice(
    entity.offset,
    entity.offset + entity.length,
  );

  assert.equal(quoteText.split('\n').length, 6);
});

test('LLM message renders safe HTML and MarkdownV2 payloads', () => {
  const message = buildLlmMessage(spec);
  const html = message.toHTML();
  const markdown = message.toMarkdownV2();

  assert.ok(html.includes('&lt;b&gt;literal&lt;/b&gt;'));
  assert.ok(html.includes('<blockquote expandable>'));
  assert.ok(
    html.includes(
      'href="https://example.com/path_(x)?a=1&amp;b=2"',
    ),
  );
  assert.ok(html.includes('<tg-time unix="1647531900" format="wDT">'));
  assert.ok(
    markdown.includes(
      'Nested \\(tap to reveal\\): *_**__~||five styles||~__**_*',
    ),
  );
  assert.ok(markdown.includes('(tg://time?unix='));

  for (const format of ['entities', 'HTML', 'MarkdownV2'] as const) {
    const payload = toTelegramPayload(message, format);

    assert.ok(payload.text.length > 0);
    assert.ok(payload.text.length <= 4096);
  }
});

test('LLM tool sends once and caches duplicate calls', async () => {
  let calls = 0;
  const result: SendOutcome = {
    ok: true,
    dryRun: true,
    formats: [
      { format: 'entities', ok: true },
      { format: 'HTML', ok: true },
      { format: 'MarkdownV2', ok: true },
    ],
  };
  const tool = createSendAdvancedMessageTool(async () => {
    calls += 1;
    return result;
  });

  const first = await tool.execute(spec, {});
  const second = await tool.execute(spec, {});

  assert.equal(calls, 1);
  assert.match(first, /succeeded in entities, HTML, MarkdownV2/);
  assert.match(second, /Already sent/);
});

test('LLM tool reports failed formats without retrying', async () => {
  let calls = 0;
  const result: SendOutcome = {
    ok: false,
    dryRun: false,
    formats: [
      { format: 'entities', ok: true },
      { format: 'HTML', ok: false, error: 'bad HTML' },
      { format: 'MarkdownV2', ok: true },
    ],
  };
  const tool = createSendAdvancedMessageTool(async () => {
    calls += 1;
    return result;
  });

  const first = await tool.execute(spec, {});
  const second = await tool.execute(spec, {});

  assert.equal(calls, 1);
  assert.match(first, /failed in entities, HTML \(failed\), MarkdownV2/);
  assert.match(second, /Already sent/);
});
