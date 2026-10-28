import type { Node } from './nodes.js';
import { buildEntities } from './render/entities.js';
import { renderHtml } from './render/html.js';
import { renderMarkdownV2 } from './render/markdown.js';
import type { MessageEntity } from './types.js';

const messageBrand = Symbol('tg-format.message');

/**
 * A rendered message fragment. It can be interpolated into `fmt` or `join`,
 * sent as native entities, or rendered as HTML / MarkdownV2.
 */
export interface FormattedMessage {
  readonly [messageBrand]: true;
  readonly text: string;
  readonly entities: MessageEntity[];
  toHTML(): string;
  toMarkdownV2(): string;
  toString(): string;
}

class Message implements FormattedMessage {
  readonly [messageBrand] = true as const;
  readonly text: string;
  readonly entities: MessageEntity[];
  readonly nodes: readonly Node[];
  #html: string | undefined;
  #markdownV2: string | undefined;

  constructor(nodes: readonly Node[]) {
    this.nodes = nodes;
    const { text, entities } = buildEntities(nodes);
    this.text = text;
    this.entities = entities;
  }

  toHTML(): string {
    return (this.#html ??= renderHtml(this.nodes));
  }

  toMarkdownV2(): string {
    return (this.#markdownV2 ??= renderMarkdownV2(this.nodes));
  }

  toString(): string {
    return this.text;
  }
}

export function messageFromNodes(nodes: readonly Node[]): FormattedMessage {
  return new Message(nodes);
}

/** Internal: retrieve the tree of a message without trusting structural input. */
export function nodesOf(value: unknown): readonly Node[] | undefined {
  return value instanceof Message ? value.nodes : undefined;
}
