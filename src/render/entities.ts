import type { Node } from '../nodes.js';
import type {
  MessageEntity,
  SimpleMessageEntityType,
  TelegramUser,
} from '../types.js';

interface Accumulator {
  text: string;
  entities: MessageEntity[];
}

interface Span {
  entity: MessageEntity;
  text: string;
  children: readonly Node[];
}

type NonTextNode = Exclude<Node, { kind: 'text' }>;

/**
 * Flatten the tree into Telegram's native text + entities representation.
 * Entities are emitted outer-first so nested spans keep a stable order.
 */
export function buildEntities(nodes: readonly Node[]): {
  text: string;
  entities: MessageEntity[];
} {
  const acc: Accumulator = { text: '', entities: [] };

  for (const node of nodes) visitNode(acc, node);

  return acc;
}

function visitNode(acc: Accumulator, node: Node): void {
  if (node.kind === 'text') {
    acc.text += node.value;
    return;
  }

  const span = toSpan(node);
  span.entity.offset = acc.text.length;
  acc.entities.push(span.entity);
  acc.text += span.text;

  for (const child of span.children) visitNode(acc, child);

  span.entity.length = acc.text.length - span.entity.offset;
}

function toSpan(node: NonTextNode): Span {
  switch (node.kind) {
    case 'style':
      return span(simpleEntity(node.style), '', node.children);
    case 'code':
      return span(codeEntity(), node.value);
    case 'pre':
      return span(preEntity(node.language), node.value);
    case 'link':
      return span(linkEntity(node.url), '', node.children);
    case 'text_mention':
      return span(mentionEntity(node.user), '', node.children);
    case 'emoji':
      return span(emojiEntity(node.id), node.value);
    case 'date_time':
      return span(dateTimeEntity(node), node.value);
    case 'quote':
      return span(
        simpleEntity(node.expandable ? 'expandable_blockquote' : 'blockquote'),
        '',
        node.children,
      );
  }
}

function span(
  entity: MessageEntity,
  text: string,
  children: readonly Node[] = [],
): Span {
  return { entity, text, children };
}

function simpleEntity(type: SimpleMessageEntityType): MessageEntity {
  return { type, offset: 0, length: 0 };
}

function codeEntity(): MessageEntity {
  return { type: 'code', offset: 0, length: 0 };
}

function preEntity(language: string | undefined): MessageEntity {
  return language === undefined
    ? { type: 'pre', offset: 0, length: 0 }
    : { type: 'pre', offset: 0, length: 0, language };
}

function linkEntity(url: string): MessageEntity {
  return { type: 'text_link', offset: 0, length: 0, url };
}

function mentionEntity(user: TelegramUser): MessageEntity {
  return { type: 'text_mention', offset: 0, length: 0, user };
}

function emojiEntity(id: string): MessageEntity {
  return { type: 'custom_emoji', offset: 0, length: 0, custom_emoji_id: id };
}

function dateTimeEntity(
  node: Extract<Node, { kind: 'date_time' }>,
): MessageEntity {
  return {
    type: 'date_time',
    offset: 0,
    length: 0,
    unix_time: node.unixTime,
    ...(node.format === undefined ? {} : { date_time_format: node.format }),
  };
}
