import type { FormattedMessage } from './message.js';
import { nodesOf } from './message.js';
import type { Node } from './nodes.js';
import { concatNodes, textNodes } from './nodes.js';

/**
 * A value accepted inside `fmt`, `join`, and the formatting helpers.
 * Plain strings and numbers are treated as literal text, never as markup.
 */
export type Content =
  | string
  | number
  | FormattedMessage
  | readonly Content[];

export function toNodes(value: unknown): readonly Node[] {
  if (typeof value === 'string') return textNodes(value);
  if (typeof value === 'number') return numberNodes(value);
  if (Array.isArray(value)) return concatNodes(value.map(toNodes));

  const nodes = nodesOf(value);
  if (nodes !== undefined) return nodes;

  throw new TypeError(
    `Unsupported value in tg-format: expected string, number, FormattedMessage, or array; received ${describe(value)}`,
  );
}

function numberNodes(value: number): Node[] {
  if (!Number.isFinite(value)) {
    throw new RangeError('Numbers interpolated into a message must be finite');
  }
  return textNodes(String(value));
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}
