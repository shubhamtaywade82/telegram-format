import { escapeHtml, escapeHtmlAttribute } from '../escape.js';
import type { Node, Style } from '../nodes.js';

const HTML_TAGS: Record<Style, string> = {
  bold: 'b',
  italic: 'i',
  underline: 'u',
  strikethrough: 's',
  spoiler: 'tg-spoiler',
};

export function renderHtml(nodes: readonly Node[]): string {
  return nodes.map(renderHtmlNode).join('');
}

function renderHtmlNode(node: Node): string {
  switch (node.kind) {
    case 'text':
      return escapeHtml(node.value);
    case 'style': {
      const tag = HTML_TAGS[node.style];
      return `<${tag}>${renderHtml(node.children)}</${tag}>`;
    }
    case 'code':
      return `<code>${escapeHtml(node.value)}</code>`;
    case 'pre':
      return renderPre(node.value, node.language);
    case 'link':
      return `<a href="${escapeHtmlAttribute(node.url)}">${renderHtml(node.children)}</a>`;
    case 'text_mention':
      return `<a href="tg://user?id=${node.user.id}">${renderHtml(node.children)}</a>`;
    case 'emoji':
      return `<tg-emoji emoji-id="${escapeHtmlAttribute(node.id)}">${escapeHtml(node.value)}</tg-emoji>`;
    case 'date_time':
      return renderDateTime(node);
    case 'quote':
      return `<blockquote${node.expandable ? ' expandable' : ''}>${renderHtml(node.children)}</blockquote>`;
  }
}

function renderPre(value: string, language?: string): string {
  const code = escapeHtml(value);
  if (language === undefined) return `<pre>${code}</pre>`;
  return `<pre><code class="language-${escapeHtmlAttribute(language)}">${code}</code></pre>`;
}

function renderDateTime(node: Extract<Node, { kind: 'date_time' }>): string {
  const format =
    node.format === undefined
      ? ''
      : ` format="${escapeHtmlAttribute(node.format)}"`;
  const unix = escapeHtmlAttribute(String(node.unixTime));
  return `<tg-time unix="${unix}"${format}>${escapeHtml(node.value)}</tg-time>`;
}
