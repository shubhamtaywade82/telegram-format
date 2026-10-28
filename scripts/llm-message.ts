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

export const DATE_TIME_FORMATS = [
  'r',
  'd',
  'D',
  't',
  'T',
  'wD',
  'wT',
  'wDT',
] as const satisfies readonly DateTimeFormat[];

const DEFAULT_LINK_URL = 'https://example.com/path_(x)?a=1&b=2';
const DEFAULT_DATE_LABEL = 'March 17, 2022, 15:45 UTC';
const DEFAULT_UNIX_TIME = 1_647_531_900;
const DEFAULT_DATE_FORMAT = 'wDT';

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
    .describe('Short phrase to render in five nested styles'),
  link_label: z.string().min(1).max(60).describe('Visible link label'),
  link_url: z
    .string()
    .url()
    .max(300)
    .regex(/^https?:\/\//i, 'Must be an http(s) URL')
    .default(DEFAULT_LINK_URL)
    .describe('Link URL; defaults to the special-character test URL'),
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
    .describe('Code block language tag'),
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
  date_label: z
    .string()
    .min(1)
    .max(60)
    .default(DEFAULT_DATE_LABEL)
    .describe('Label for the absolute date-time'),
  unix_time: z
    .number()
    .int()
    .positive()
    .default(DEFAULT_UNIX_TIME)
    .describe('Unix timestamp in seconds'),
  date_format: z
    .enum(DATE_TIME_FORMATS)
    .default(DEFAULT_DATE_FORMAT)
    .describe('Telegram date-time format'),
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
  const expandable = ensureExpandableQuote(normalizeProse(spec.expandable_quote));
  const quoted = fmt`${bold(normalizeProse(spec.quote))}

Nested: ${italic('italic')}, ${link('a link', 'https://example.com')}, and ${code('npm test')}.`;
  const nowUnix = Math.floor(Date.now() / 1000);

  return fmt`${bold(spec.title)}

Escaping: _ * [ ] ( ) ~ \` > # + - = | { } . ! \\ < & "
Unicode: ${bold('👍🏽 👨‍👩‍👧‍👦')} | HTML: <b>literal</b> & "quotes"
Intro: ${spec.intro}
Nested: ${bold(italic(underline(strikethrough(spoiler(spec.nested_text)))))}
Adjacent: ${italic('italic')}${underline('underline')}

${link(bold(spec.link_label), spec.link_url)}
Inline code: ${code(spec.inline_code)}

${pre(spec.code, spec.code_language)}

${quote(quoted)}

${expandableQuote(expandable)}

${dateTime('now', nowUnix, 'r')} · ${dateTime(spec.date_label, spec.unix_time, spec.date_format)}
`;
}

/** Models sometimes emit literal newline escapes or HTML breaks. */
function normalizeProse(value: string): string {
  return value.replace(/<br\s*\/?>/gi, '\n').replace(/\\n/g, '\n');
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
