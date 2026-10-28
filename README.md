# @nemesis-oss/tg-format

Type-safe Telegram message formatting for TypeScript. Build a message once, then send it as **native `MessageEntity[]`**, **HTML**, or **MarkdownV2**.

- **Entity-first.** No parse mode, no escaping bugs, no client-side formatting differences.
- **One tree, three renderers.** `message.text` + `message.entities`, `message.toHTML()`, or `message.toMarkdownV2()`.
- **Safe by default.** Every interpolation is treated as literal text and escaped for the selected output format.
- **Correct offsets.** Entities use UTF-16 code units, exactly matching Telegram, including emoji and ZWJ sequences.
- **Telegram-native extras.** Custom emoji, blockquotes, and localizable date-time entities.
- **Zero runtime dependencies.** Framework-agnostic and ESM-only.

## Install

```sh
pnpm add @nemesis-oss/tg-format
# or
npm install @nemesis-oss/tg-format
```

## Quick start

```ts
import { fmt, bold, link } from '@nemesis-oss/tg-format';

const message = fmt`Hello ${bold('world')}!\nRead the ${link('docs', 'https://example.com')}.`;

message.text;      // "Hello world!\nRead the docs."
message.entities;  // [{ type: 'bold', offset: 6, length: 5 }, ...]
message.toHTML();  // 'Hello <b>world</b>!\nRead the <a href="...">docs</a>.'
```

Send it with the native entity API — no `parse_mode`, no escaping:

```ts
await ctx.reply(message.text, { entities: message.entities });
```

Or use one of the renderers:

```ts
await ctx.reply(message.toHTML(), { parse_mode: 'HTML' });
await ctx.reply(message.toMarkdownV2(), { parse_mode: 'MarkdownV2' });
```

## One message, three renderings

```ts
const message = fmt`Deploy ${bold('v2')} is ${italic('live')}.`;

message.text;             // 'Deploy v2 is live.'
message.entities;
// [
//   { type: 'bold', offset: 7, length: 2 },
//   { type: 'italic', offset: 13, length: 4 },
// ]

message.toHTML();         // 'Deploy <b>v2</b> is <i>live</i>.'
message.toMarkdownV2();   // 'Deploy *v2* is _live_\.'
```

`fmt` returns a `FormattedMessage` with:

| Member | Description |
| --- | --- |
| `text` | Plain text content, ready for `sendMessage`. |
| `entities` | Native Telegram `MessageEntity[]` with UTF-16 offsets. |
| `toHTML()` | HTML parse-mode string. |
| `toMarkdownV2()` | MarkdownV2 parse-mode string. |
| `toString()` | Alias for `text`. |

## Framework examples

### grammY

```ts
import { Bot } from 'grammy';
import { fmt, bold, code } from '@nemesis-oss/tg-format';

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command('status', async (ctx) => {
  const message = fmt`Status: ${bold('ok')} (${code('build 42')})`;
  await ctx.reply(message.text, { entities: message.entities });
});
```

### Telegraf

```ts
import { Telegraf } from 'telegraf';
import { fmt, bold } from '@nemesis-oss/tg-format';

const bot = new Telegraf(process.env.BOT_TOKEN!);

bot.start(async (ctx) => {
  const message = fmt`Welcome, ${bold(ctx.from.first_name)}!`;
  await ctx.reply(message.text, { entities: message.entities });
});
```

### Raw Bot API

```ts
import { fmt, bold } from '@nemesis-oss/tg-format';

const message = fmt`Hello ${bold('world')}!`;

await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    chat_id: process.env.CHAT_ID,
    text: message.text,
    entities: message.entities,
  }),
});
```

The entity output works anywhere `sendMessage`, `editMessageText`, `sendPhoto` captions, etc. accept `entities`. For HTML or MarkdownV2, pass the renderer output with the matching `parse_mode`.

## Telegram payloads

`toTelegramPayload` converts a message into the exact fields a Bot API method accepts. The default is native entities; parsed formats return the matching `parse_mode`.

```ts
import { toTelegramPayload } from '@nemesis-oss/tg-format';

toTelegramPayload(message);
// { text: '...', entities: [...] }

toTelegramPayload(message, 'HTML');
// { text: '...', parse_mode: 'HTML' }

toTelegramPayload(message, 'MarkdownV2');
// { text: '...', parse_mode: 'MarkdownV2' }
```

Use it directly in raw requests:

```ts
const payload = toTelegramPayload(message, 'HTML');

await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ chat_id: chatId, ...payload }),
});
```

The helper returns plain objects and has no framework dependencies, so it works with grammY, Telegraf, raw `fetch`, or any Bot API client.

## Builders

### Inline styles

```ts
import { bold, italic, underline, strikethrough, spoiler } from '@nemesis-oss/tg-format';

bold('x');
italic('x');
underline('x');
strikethrough('x');
spoiler('x');
```

Short aliases: `b`, `i`, `u`, `s`.

Styles accept any inline content, including other styles, links, mentions, custom emoji, and inline code:

```ts
fmt`${bold(italic('nested'))} ${bold(link('docs', 'https://example.com'))}`;
```

### Code

```ts
import { code, pre } from '@nemesis-oss/tg-format';

code('npm install');                    // inline code
pre('const x = 1;');                    // code block
pre('const x = 1;', 'ts');              // code block with language
```

`code` and `pre` take a plain string and cannot contain other entities. The `pre` language must match `[A-Za-z0-9_+#.-]+`.

### Links and mentions

```ts
import { link, mention } from '@nemesis-oss/tg-format';

link('docs', 'https://example.com');

mention('Alice', 123);                  // text_link to tg://user?id=123
mention('Alice', user);                 // text_mention with a User object
```

`mention(content, userId)` accepts formatted content. `mention(label, user)` requires a plain string label because Telegram's `text_mention` entity carries the user object itself. The object must include `id`, `is_bot`, and `first_name`.

### Custom emoji

```ts
import { emoji } from '@nemesis-oss/tg-format';

emoji('👍', '5368324170671202286');
```

The custom emoji ID is a numeric string because Telegram IDs exceed `Number.MAX_SAFE_INTEGER`. The fallback must be exactly one grapheme.

### Date and time

```ts
import { dateTime } from '@nemesis-oss/tg-format';

dateTime('March 17, 2022, 22:45', 1647531900, 'wDT');
dateTime('in 2 hours', 1647531900, 'r');
dateTime('22:45', 1647531900);
```

`dateTime(label, unixTime, format?)` produces a `date_time` entity. Telegram clients render the timestamp in the viewer's locale and timezone; `label` is the fallback text.

Formats follow Telegram's `r|w?[dD]?[tT]?` grammar:

| Control | Meaning |
| --- | --- |
| `r` | Relative time; cannot be combined with other controls |
| `w` | Localized weekday |
| `d` / `D` | Short / long date |
| `t` / `T` | Short / long time |

Omit the format (or pass `''`) to keep the label as-is while still exposing the timestamp as `date_time`. The HTML renderer emits `<tg-time unix="..." format="...">`, and MarkdownV2 emits `![label](tg://time?unix=...&format=...)`.

### Blockquotes

```ts
import { quote, expandableQuote } from '@nemesis-oss/tg-format';

quote('A quoted line');
expandableQuote('Hidden until expanded');
```

Aliases: `blockquote`, `expandableBlockquote`. Blockquotes cannot be nested. They may contain styles, links, mentions, custom emoji, and inline code, but not `pre`.

### Composition

```ts
import { bold, concat, fmt, join } from '@nemesis-oss/tg-format';

fmt`Hello ${bold('world')}!`;

join(['a', 'b', 'c'], ', ');            // 'a, b, c'
join([bold('a'), bold('b')], ' → ');    // styled separator
concat('Status: ', bold('ok'));         // no separator
```

`fmt`, `join`, and every builder accept `Content`:

```ts
type Content = string | number | FormattedMessage | readonly Content[];
```

Plain strings and numbers are always literal text — interpolations are never parsed as markup. Arrays are flattened. A `FormattedMessage` can be interpolated without losing its entities.

#### Nesting rules

| Container | Can contain |
| --- | --- |
| Styles (`bold`, `italic`, `underline`, `strikethrough`, `spoiler`) | Other styles, links, mentions, custom emoji, date-time, inline `code` |
| `link` / `mention` | Styles, inline `code` |
| `quote` | Styles, links, mentions, custom emoji, date-time, inline `code` |
| `code` / `pre` / `dateTime` | Nothing — plain text only |

Invalid nesting throws a `RangeError` instead of producing output Telegram would reject. Empty containers, code blocks inside styles, nested links, date-time inside links, nested blockquotes, and `pre` inside blockquotes are rejected.

## MarkdownV2 notes

Escaping is automatic:

```ts
fmt`Price: ${bold('$5.00')} (was $10.00!)`.toMarkdownV2();
// 'Price: *$5\.00* (was $10\.00\!)'
```

Block elements are placed on their own lines so the output stays valid:

```ts
fmt`Before ${pre('const x = 1;', 'ts')} after`.toMarkdownV2();
// 'Before \n```ts\nconst x = 1;\n```\n after'
```

Adjacent italic and underline markers are separated with an empty bold (`**`) so Telegram does not misread `___` as a single marker.

Telegram's MarkdownV2 has no way to express every entity combination. If you need guaranteed fidelity, send `text` + `entities`; the renderers are convenience paths.

## API

```ts
function fmt(strings: TemplateStringsArray, ...values: unknown[]): FormattedMessage;

function bold(...content: Content[]): FormattedMessage;
function italic(...content: Content[]): FormattedMessage;
function underline(...content: Content[]): FormattedMessage;
function strikethrough(...content: Content[]): FormattedMessage;
function spoiler(...content: Content[]): FormattedMessage;

function code(value: string): FormattedMessage;
function pre(value: string, language?: string): FormattedMessage;
function dateTime(
  text: string,
  unixTime: number,
  format?: DateTimeFormat,
): FormattedMessage;

function link(content: Content, url: string): FormattedMessage;

function mention(content: Content, userId: number): FormattedMessage;
function mention(label: string, user: TelegramUser): FormattedMessage;

function emoji(fallback: string, customEmojiId: string): FormattedMessage;

function quote(content: Content): FormattedMessage;
function expandableQuote(content: Content): FormattedMessage;

function join(items: readonly Content[], separator?: Content): FormattedMessage;
function concat(...content: Content[]): FormattedMessage;

function toTelegramPayload(message: FormattedMessage): TelegramEntitiesPayload;
function toTelegramPayload(message: FormattedMessage, format: 'entities'): TelegramEntitiesPayload;
function toTelegramPayload(message: FormattedMessage, format: TelegramParseMode): TelegramParsedPayload;
function toTelegramPayload(message: FormattedMessage, format: TelegramPayloadFormat): TelegramPayload;

function escapeHtml(text: string): string;
function escapeMarkdownV2(text: string): string;
```

Types exported: `Content`, `DateTimeFormat`, `FormattedMessage`, `MessageEntity`, `SimpleMessageEntityType`, `TelegramUser`, `TelegramEntitiesPayload`, `TelegramParsedPayload`, `TelegramPayload`, `TelegramPayloadFormat`, `TelegramParseMode`.

## Behavior and limitations

- Entity offsets and lengths use UTF-16 code units, matching JavaScript strings and Telegram exactly.
- Entities are emitted outer-first. Adjacent identical styles and nested duplicate styles are merged.
- `date_time` fallbacks are plain text; the rendered value is chosen by the Telegram client from `unix_time` and the optional format.
- Numbers must be finite; `NaN` and `Infinity` throw a `RangeError`.
- `fmt` must be used as a tagged template. Calling it as a normal function throws.
- Message length limits and automatic splitting are intentionally out of scope.
- The library formats messages; it does not call the Telegram API except in the opt-in live check script.
- This package is ESM-only and targets modern runtimes (Node.js 22+, Bun, Deno, and modern browsers/bundlers).

## Development

```sh
pnpm install
pnpm test        # unit and deterministic fuzz tests via node:test
pnpm typecheck
pnpm build
pnpm check       # typecheck + test + build
```

### Live Telegram check

The local suite does not prove that Telegram accepts every payload. To verify against a real bot, set a bot token and chat ID:

```sh
BOT_TOKEN=123:abc CHAT_ID=123456789 pnpm test:live
```

The script sends the same message as native entities, HTML, and MarkdownV2, including nested styles, a code block, an expandable quote, and a date-time entity. It prints the message IDs so you can inspect the rendering. Set `DELETE_MESSAGES=1` to remove them afterward.

CI runs `pnpm check` on Node.js 22 and 24. A separate manually triggered workflow runs the live check with `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` repository secrets.

## License

MIT
