import type { DateTimeFormat, TelegramUser } from './types.js';

export type Style =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'spoiler';

export type Node =
  | { readonly kind: 'text'; readonly value: string }
  | {
      readonly kind: 'style';
      readonly style: Style;
      readonly children: readonly Node[];
    }
  | { readonly kind: 'code'; readonly value: string }
  | {
      readonly kind: 'pre';
      readonly value: string;
      readonly language?: string;
    }
  | {
      readonly kind: 'link';
      readonly children: readonly Node[];
      readonly url: string;
    }
  | {
      readonly kind: 'text_mention';
      readonly children: readonly Node[];
      readonly user: TelegramUser;
    }
  | { readonly kind: 'emoji'; readonly value: string; readonly id: string }
  | {
      readonly kind: 'date_time';
      readonly value: string;
      readonly unixTime: number;
      readonly format?: DateTimeFormat;
    }
  | {
      readonly kind: 'quote';
      readonly children: readonly Node[];
      readonly expandable: boolean;
    };

export function textNodes(value: string): Node[] {
  return value === '' ? [] : [{ kind: 'text', value }];
}

/** Concatenate node lists, merging adjacent text and same-style nodes. */
export function concatNodes(groups: readonly (readonly Node[])[]): Node[] {
  const result: Node[] = [];

  for (const group of groups) {
    for (const node of group) appendNode(result, node);
  }

  return result;
}

function appendNode(result: Node[], node: Node): void {
  if (node.kind === 'text') {
    if (node.value === '') return;
    const last = result[result.length - 1];
    if (last?.kind === 'text') {
      result[result.length - 1] = {
        kind: 'text',
        value: last.value + node.value,
      };
      return;
    }
    result.push(node);
    return;
  }

  if (node.kind === 'style') {
    const last = result[result.length - 1];
    if (last?.kind === 'style' && last.style === node.style) {
      result[result.length - 1] = {
        kind: 'style',
        style: node.style,
        children: concatNodes([last.children, node.children]),
      };
      return;
    }
  }

  result.push(node);
}

export function textLength(nodes: readonly Node[]): number {
  let length = 0;

  for (const node of nodes) {
    switch (node.kind) {
      case 'text':
      case 'code':
      case 'pre':
      case 'emoji':
      case 'date_time':
        length += node.value.length;
        break;
      default:
        length += textLength(node.children);
    }
  }

  return length;
}

export function containsNode(
  nodes: readonly Node[],
  kinds: ReadonlySet<Node['kind']>,
): boolean {
  for (const node of nodes) {
    if (kinds.has(node.kind)) return true;
    if ('children' in node && containsNode(node.children, kinds)) return true;
  }
  return false;
}

/** Remove nested instances of `style`; the outer style already covers them. */
export function stripStyle(nodes: readonly Node[], style: Style): Node[] {
  return concatNodes(
    nodes.map((node) => {
      if (node.kind === 'style') {
        const children = stripStyle(node.children, style);
        return node.style === style ? children : [{ ...node, children }];
      }

      if (
        node.kind === 'link' ||
        node.kind === 'text_mention' ||
        node.kind === 'quote'
      ) {
        return [{ ...node, children: stripStyle(node.children, style) }];
      }

      return [node];
    }),
  );
}
