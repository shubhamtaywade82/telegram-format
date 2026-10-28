const MARKDOWN_V2_SPECIAL = /[\\_*\[\]()~`>#+\-=|{}.!]/g;
const MARKDOWN_V2_CODE_SPECIAL = /[`\\]/g;
const MARKDOWN_V2_URL_SPECIAL = /[)\\]/g;

/** Escape text for Telegram's HTML parse mode. */
export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/** Escape a value used inside a double-quoted HTML attribute. */
export function escapeHtmlAttribute(text: string): string {
  return escapeHtml(text).replaceAll('"', '&quot;');
}

/** Escape literal text for Telegram's MarkdownV2 parse mode. */
export function escapeMarkdownV2(text: string): string {
  return text.replace(MARKDOWN_V2_SPECIAL, '\\$&');
}

/** Escape the contents of a MarkdownV2 `code` or `pre` entity. */
export function escapeMarkdownV2Code(text: string): string {
  return text.replace(MARKDOWN_V2_CODE_SPECIAL, '\\$&');
}

/** Escape the URL portion of a MarkdownV2 link or custom emoji. */
export function escapeMarkdownV2Url(text: string): string {
  return text.replace(MARKDOWN_V2_URL_SPECIAL, '\\$&');
}
