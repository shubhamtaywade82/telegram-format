/** Minimal Telegram user shape required by `text_mention` entities. */
export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string | undefined;
  username?: string | undefined;
  language_code?: string | undefined;
  is_premium?: boolean | undefined;
  added_to_attachment_menu?: boolean | undefined;
}

/** Entity types that carry no extra fields. */
export type SimpleMessageEntityType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'spoiler'
  | 'blockquote'
  | 'expandable_blockquote';

/**
 * Format string accepted by Telegram's `date_time` entity.
 *
 * Mirrors the documented `r|w?[dD]?[tT]?` grammar: relative time, optional
 * weekday, optional short/long date, and optional short/long time.
 */
export type DateTimeFormat =
  | 'r'
  | `${'' | 'w'}${'' | 'd' | 'D'}${'' | 't' | 'T'}`;

/**
 * The subset of Telegram's `MessageEntity` produced by this library.
 *
 * Offsets and lengths use UTF-16 code units, which is exactly how JavaScript
 * strings are indexed. Emoji and other non-BMP characters therefore match
 * Telegram's offsets without conversion.
 */
export type MessageEntity =
  | { type: SimpleMessageEntityType; offset: number; length: number }
  | { type: 'code'; offset: number; length: number }
  | { type: 'pre'; offset: number; length: number; language?: string }
  | { type: 'text_link'; offset: number; length: number; url: string }
  | { type: 'text_mention'; offset: number; length: number; user: TelegramUser }
  | {
      type: 'custom_emoji';
      offset: number;
      length: number;
      custom_emoji_id: string;
    }
  | {
      type: 'date_time';
      offset: number;
      length: number;
      unix_time: number;
      date_time_format?: DateTimeFormat;
    };
