import type { Content } from './content.js';
import { toNodes } from './content.js';
import type { FormattedMessage } from './message.js';
import { messageFromNodes } from './message.js';
import type { Node } from './nodes.js';
import { concatNodes, textNodes } from './nodes.js';

function contentNodes(content: readonly Content[]): Node[] {
  return concatNodes(content.map(toNodes));
}

export function join(
  items: readonly Content[],
  separator: Content = '',
): FormattedMessage {
  const groups: (readonly Node[])[] = [];

  items.forEach((item, index) => {
    if (index > 0) groups.push(toNodes(separator));
    groups.push(toNodes(item));
  });

  return messageFromNodes(concatNodes(groups));
}

/** Concatenate content without separators. */
export function concat(...content: Content[]): FormattedMessage {
  return messageFromNodes(contentNodes(content));
}

export function fmt(
  strings: TemplateStringsArray,
  ...values: readonly unknown[]
): FormattedMessage {
  if (!Array.isArray(strings)) {
    throw new TypeError('fmt must be used as a tagged template literal');
  }
  if (values.length !== strings.length - 1) {
    throw new TypeError('fmt received a mismatched number of values');
  }

  const groups: (readonly Node[])[] = [];

  for (let index = 0; index < strings.length; index += 1) {
    groups.push(textNodes(strings[index]!));
    if (index < values.length) groups.push(toNodes(values[index]));
  }

  return messageFromNodes(concatNodes(groups));
}
