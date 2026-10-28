import {
  escapeMarkdownV2,
  escapeMarkdownV2Code,
  escapeMarkdownV2Url,
} from '../escape.js';
import type { Node, Style } from '../nodes.js';

type Token =
  | { readonly kind: 'inline'; readonly value: string }
  | { readonly kind: 'underscore'; readonly value: '_' | '__' }
  | { readonly kind: 'block'; readonly value: string };

const STYLE_MARKERS: Record<Style, string> = {
  bold: '*',
  italic: '_',
  underline: '__',
  strikethrough: '~',
  spoiler: '||',
};

export function renderMarkdownV2(nodes: readonly Node[]): string {
  return stringify(renderNodes(nodes));
}

function renderNodes(nodes: readonly Node[]): Token[] {
  const tokens: Token[] = [];
  for (const node of nodes) tokens.push(...renderNode(node));
  return tokens;
}

function renderNode(node: Node): Token[] {
  switch (node.kind) {
    case 'text':
      return [{ kind: 'inline', value: escapeMarkdownV2(node.value) }];
    case 'style':
      return renderStyle(node);
    case 'code':
      return [
        {
          kind: 'inline',
          value: `\`${escapeMarkdownV2Code(node.value)}\``,
        },
      ];
    case 'pre':
      return renderPre(node);
    case 'link':
      return renderLink(node.children, escapeMarkdownV2Url(node.url));
    case 'text_mention':
      return renderLink(node.children, `tg://user?id=${node.user.id}`);
    case 'emoji':
      return renderEmoji(node);
    case 'date_time':
      return renderDateTime(node);
    case 'quote':
      return renderQuote(node);
  }
}

function renderStyle(node: Extract<Node, { kind: 'style' }>): Token[] {
  const marker = STYLE_MARKERS[node.style];
  const open: Token =
    node.style === 'italic' || node.style === 'underline'
      ? { kind: 'underscore', value: marker as '_' | '__' }
      : { kind: 'inline', value: marker };

  return [open, ...renderNodes(node.children), open];
}

function renderPre(node: Extract<Node, { kind: 'pre' }>): Token[] {
  const fence = node.language === undefined ? '```' : '```' + node.language;
  const code = escapeMarkdownV2Code(node.value);
  const body = code.endsWith('\n') ? code : `${code}\n`;
  return [{ kind: 'block', value: `${fence}\n${body}\`\`\`` }];
}

function renderLink(
  children: readonly Node[],
  url: string,
): Token[] {
  return [
    { kind: 'inline', value: '[' },
    ...renderNodes(children),
    { kind: 'inline', value: `](${url})` },
  ];
}

function renderQuote(node: Extract<Node, { kind: 'quote' }>): Token[] {
  const lines = stringify(renderNodes(node.children)).split('\n');
  const firstPrefix = node.expandable ? '**>' : '>';
  const quoted = lines
    .map((line, index) => `${index === 0 ? firstPrefix : '>'}${line}`)
    .join('\n');

  return [
    {
      kind: 'block',
      value: node.expandable ? `${quoted}||` : quoted,
    },
  ];
}

function renderDateTime(
  node: Extract<Node, { kind: 'date_time' }>,
): Token[] {
  const format = node.format === undefined ? '' : `&format=${node.format}`;
  const url = escapeMarkdownV2Url(
    `tg://time?unix=${node.unixTime}${format}`,
  );
  return [
    {
      kind: 'inline',
      value: `![${escapeMarkdownV2(node.value)}](${url})`,
    },
  ];
}

function renderEmoji(node: Extract<Node, { kind: 'emoji' }>): Token[] {
  return [
    {
      kind: 'inline',
      value: `![${escapeMarkdownV2(node.value)}](tg://emoji?id=${node.id})`,
    },
  ];
}

function stringify(tokens: readonly Token[]): string {
  let output = '';
  let previousUnderscore = false;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;

    if (token.kind === 'block') {
      if (output !== '' && !output.endsWith('\n')) output += '\n';
      output += token.value;
      if (
        hasContentAfter(tokens, index + 1) &&
        !output.endsWith('\n') &&
        !startsWithNewline(tokens, index + 1)
      ) {
        output += '\n';
      }
      previousUnderscore = false;
      continue;
    }

    if (token.kind === 'underscore' && previousUnderscore) output += '**';
    output += token.value;
    previousUnderscore = token.kind === 'underscore';
  }

  return output;
}

function hasContentAfter(tokens: readonly Token[], start: number): boolean {
  for (let index = start; index < tokens.length; index += 1) {
    if (tokens[index]!.value !== '') return true;
  }
  return false;
}

function startsWithNewline(tokens: readonly Token[], start: number): boolean {
  for (let index = start; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (token.value === '') continue;
    return token.kind === 'inline' && token.value.startsWith('\n');
  }
  return false;
}
