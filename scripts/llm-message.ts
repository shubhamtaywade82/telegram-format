import { z } from 'zod';
import {
  bold,
  code,
  dateTime,
  expandableQuote,
  fmt,
  italic,
  link,
  pre,
  quote,
  spoiler,
  strikethrough,
  underline,
  type DateTimeFormat,
  type FormattedMessage,
} from '../src/index.js';

export const TEST_LINK_URL = 'https://example.com/path_(x)?a=1&b=2';
export const TEST_DATE_LABEL = 'March 17, 2022, 15:45 UTC';
export const TEST_UNIX_TIME = 1_647_531_900;
export const TEST_DATE_FORMAT: DateTimeFormat = 'wDT';

export const advancedMessageSpecSchema = z.object({
  title: z.string().min(1).max(80).describe('Bold title'),
  intro: z
    .string()
    .min(1)
    .max(200)
    .describe('Plain intro containing punctuation and an emoji'),
  nested_text: z
    .string()
    .min(1)
    .max(160)
    .regex(
      /^[\p{L}\p{N}\p{Zs}\p{P}\p{Sc}\p{Sm}]+$/u,
      'Use readable letters, numbers, spaces, and simple punctuation',
    )
    .describe('Short readable phrase without emoji or newlines'),
  link_label: z.string().min(1).max(60).describe('Visible link label'),
  inline_code: z
    .string()
    .min(1)
    .max(80)
    .describe('Short inline code snippet'),
  code: z.string().min(1).max(400).describe('Code block content'),
  code_language: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Za-z0-9_+#.-]+$/, 'Use a simple language tag')
    .default('ts')
    .describe('Code block language tag; defaults to ts'),
  quote: z
    .string()
    .min(1)
    .max(300)
    .describe('Multiline blockquote content'),
  expandable_quote: z
    .string()
    .min(1)
    .max(600)
    .describe('Expandable quote text; the runtime pads it to six lines'),
});

export type AdvancedMessageSpec = z.infer<typeof advancedMessageSpecSchema>;

const EXPANDABLE_FALLBACK_LINES = [
  'This line is hidden until the quote is expanded.',
  'The quote stays collapsed by default.',
  'Tap the quote to reveal the complete text.',
  'This line only appears after expanding.',
  'Expandable quotes hide long content behind a tap.',
  'This is the final line of the expandable quote.',
] as const;

/** Build the advanced Telegram message from model-provided content. */
export function buildLlmMessage(spec: AdvancedMessageSpec): FormattedMessage {
  const expandable = ensureExpandableQuote(
    normalizeProse(spec.expandable_quote),
  );
  const quoted = fmt`${bold(normalizeProse(spec.quote))}

Nested: ${italic('italic')}, ${link('a link', 'https://example.com')}, and ${code('npm test')}.`;
  const nowUnix = Math.floor(Date.now() / 1000);

  return fmt`${bold(oneLine(spec.title))}

Escaping: _ * [ ] ( ) ~ \` > # + - = | { } . ! \\ < & "
Unicode: ${bold('👍🏽 👨‍👩‍👧‍👦')} | HTML: <b>literal</b> & "quotes"
Intro: ${normalizeProse(spec.intro)}
Nested: ${bold(italic(underline(strikethrough(spoiler(oneLine(spec.nested_text))))))}
Adjacent: ${italic('italic')}${underline('underline')}

${link(bold(oneLine(spec.link_label)), TEST_LINK_URL)}
Inline code: ${code(spec.inline_code)}

${pre(spec.code, spec.code_language)}

${quote(quoted)}

${expandableQuote(expandable)}

${dateTime('now', nowUnix, 'r')} · ${dateTime(TEST_DATE_LABEL, TEST_UNIX_TIME, TEST_DATE_FORMAT)}
`;
}

/** Models sometimes emit literal newline escapes, HTML breaks, or entities. */
function normalizeProse(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\\n/g, '\n')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/gi, ' ');
}

function oneLine(value: string): string {
  return normalizeProse(value).replace(/\s+/g, ' ').trim();
}

function ensureExpandableQuote(value: string): string {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const fallback of EXPANDABLE_FALLBACK_LINES) {
    if (lines.length >= 6) break;
    lines.push(fallback);
  }

  return lines.join('\n');
}
