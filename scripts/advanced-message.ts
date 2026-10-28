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
  type FormattedMessage,
} from '../src/index.js';

const specialUrl = 'https://example.com/path_(x)?a=1&b=2';
const quoted = fmt`${bold('Quoted heading')}
with ${italic('italic')}, ${link('a link', 'https://example.com')}, and ${code('npm test')}.`;
const expandable = [
  'Expandable quote content. This quote starts collapsed.',
  'Only the first few lines are visible by default.',
  'Tap the quote to expand it and reveal the rest.',
  'This line is part of the hidden section.',
  'So is this one.',
  'This is the final line of the expandable quote.',
].join('\n');

/** Build the message used by the live Telegram smoke test. */
export function buildAdvancedMessage(): FormattedMessage {
  const nowUnix = Math.floor(Date.now() / 1000);

  return fmt`${bold('Advanced Telegram formatting check')}

Escaping: _ * [ ] ( ) ~ \` > # + - = | { } . ! \\ < & "
Nested: ${bold(italic(underline(strikethrough(spoiler('five styles')))))}
Adjacent: ${italic('italic')}${underline('underline')}
Unicode: ${bold('👍🏽 👨‍👩‍👧‍👦')} | HTML: <b>literal</b> & "quotes"

${link(bold('Link with (parens) & bold'), specialUrl)}
Inline code: ${code('a`b\\c')}

${pre('const re = /`/g;\nconst path = "C:\\tmp";', 'ts')}

${quote(quoted)}

${expandableQuote(expandable)}

${dateTime('now', nowUnix, 'r')} · ${dateTime('March 17, 2022, 15:45 UTC', 1647531900, 'wDT')}
`;
}
