export interface HtmlElement {
  tag: string;
  attributes: Record<string, string>;
  children: HtmlElement[];
  text: string;
}

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec: string) => String.fromCodePoint(parseInt(dec, 10)));
}

export function parseHtml(html: string): HtmlElement {
  const root: HtmlElement = { tag: '#root', attributes: {}, children: [], text: '' };
  const stack: HtmlElement[] = [root];
  let i = 0;
  const len = html.length;

  const appendText = (text: string) => {
    const parent = stack[stack.length - 1];
    const last = parent.children[parent.children.length - 1];
    if (last && last.tag === '#text') {
      last.text += text;
    } else {
      parent.children.push({ tag: '#text', attributes: {}, children: [], text });
    }
  };

  while (i < len) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      if (i < len) appendText(decodeEntities(html.slice(i)));
      break;
    }
    if (lt > i) appendText(decodeEntities(html.slice(i, lt)));

    // comment
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt);
      i = end === -1 ? len : end + 3;
      continue;
    }
    // CDATA
    if (html.startsWith('<![CDATA[', lt)) {
      const end = html.indexOf(']]>', lt);
      const text = end === -1 ? html.slice(lt + 9) : html.slice(lt + 9, end);
      appendText(text);
      i = end === -1 ? len : end + 3;
      continue;
    }
    // doctype / declaration
    if (html.startsWith('<!', lt) || html.startsWith('<?', lt)) {
      const end = html.indexOf('>', lt);
      i = end === -1 ? len : end + 1;
      continue;
    }

    let cursor = lt + 1;
    const closing = html[cursor] === '/';
    if (closing) cursor += 1;

    const tagStart = cursor;
    while (cursor < len && !/[\s/<>]/.test(html[cursor])) cursor += 1;
    const tag = html.slice(tagStart, cursor).toLowerCase();
    if (!tag) {
      i = lt + 1;
      continue;
    }

    const attributes: Record<string, string> = {};
    for (;;) {
      while (cursor < len && /\s/.test(html[cursor])) cursor += 1;
      if (cursor >= len || html[cursor] === '>' || html[cursor] === '/') break;
      const nameStart = cursor;
      while (cursor < len && !/[\s=/<>]/.test(html[cursor])) cursor += 1;
      const name = html.slice(nameStart, cursor);
      while (cursor < len && /\s/.test(html[cursor])) cursor += 1;
      let value = '';
      if (html[cursor] === '=') {
        cursor += 1;
        while (cursor < len && /\s/.test(html[cursor])) cursor += 1;
        const quote = html[cursor];
        if (quote === '"' || quote === "'") {
          cursor += 1;
          const start = cursor;
          while (cursor < len && html[cursor] !== quote) cursor += 1;
          value = decodeEntities(html.slice(start, cursor));
          cursor += 1;
        } else {
          const start = cursor;
          while (cursor < len && !/[\s>]/.test(html[cursor])) cursor += 1;
          value = decodeEntities(html.slice(start, cursor));
        }
      }
      if (name) attributes[name.toLowerCase()] = value;
    }
    let selfClosing = false;
    if (html[cursor] === '/') {
      selfClosing = true;
      cursor += 1;
    }
    if (html[cursor] === '>') cursor += 1;

    if (closing) {
      // pop stack until matching tag found; if found, remove it (never remove root)
      for (let s = stack.length - 1; s > 0; s -= 1) {
        if (stack[s].tag === tag) {
          stack.length = s;
          break;
        }
      }
    } else if (selfClosing || VOID_TAGS.has(tag)) {
      stack[stack.length - 1].children.push({ tag, attributes, children: [], text: '' });
    } else {
      const element: HtmlElement = { tag, attributes, children: [], text: '' };
      stack[stack.length - 1].children.push(element);
      stack.push(element);
    }

    i = cursor;
  }

  collapseText(root);
  return root;
}

function collapseText(element: HtmlElement): void {
  const parts: string[] = [];
  const collect = (el: HtmlElement) => {
    for (const child of el.children) {
      if (child.tag === '#text') {
        if (child.text.trim()) parts.push(child.text);
      } else {
        collect(child);
      }
    }
  };
  collect(element);
  element.text = parts.join(' ').replace(/\s+/g, ' ').trim();
  for (const child of element.children) {
    if (child.tag !== '#text') collapseText(child);
  }
}