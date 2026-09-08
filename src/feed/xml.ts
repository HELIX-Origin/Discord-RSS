export interface XmlElement {
  name: string;
  attributes: Record<string, string>;
  children: XmlElement[];
  text: string;
}

export interface XmlDocument {
  root: XmlElement;
}

const enum TokenKind {
  OpenTag,
  CloseTag,
  SelfClose,
  Text,
  CData,
  Comment,
  Declaration,
  Processing,
}

interface Token {
  kind: TokenKind;
  name: string;
  attributes: Record<string, string>;
  text: string;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec: string) => String.fromCodePoint(parseInt(dec, 10)));
}

function tokenize(xml: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = xml.length;

  const readName = (): string => {
    const start = i;
    while (i < len && /[^\s/>=]/.test(xml[i])) i += 1;
    return xml.slice(start, i);
  };

  const readAttributes = (): Record<string, string> => {
    const attributes: Record<string, string> = {};
    for (;;) {
      while (i < len && /\s/.test(xml[i])) i += 1;
      if (i >= len || xml[i] === '>' || xml[i] === '/') break;
      const name = readName();
      while (i < len && /\s/.test(xml[i])) i += 1;
      let value = '';
      if (xml[i] === '=') {
        i += 1;
        while (i < len && /\s/.test(xml[i])) i += 1;
        const quote = xml[i];
        if (quote === '"' || quote === "'") {
          i += 1;
          const start = i;
          while (i < len && xml[i] !== quote) i += 1;
          value = decodeEntities(xml.slice(start, i));
          i += 1;
        }
      }
      attributes[name] = value;
    }
    return attributes;
  };

  while (i < len) {
    if (xml[i] === '<') {
      if (xml.startsWith('<!--', i)) {
        const end = xml.indexOf('-->', i);
        if (end === -1) break;
        tokens.push({ kind: TokenKind.Comment, name: '', attributes: {}, text: xml.slice(i, end + 3) });
        i = end + 3;
        continue;
      }
      if (xml.startsWith('<![CDATA[', i)) {
        const end = xml.indexOf(']]>', i + 9);
        if (end === -1) break;
        tokens.push({ kind: TokenKind.CData, name: '', attributes: {}, text: xml.slice(i + 9, end) });
        i = end + 3;
        continue;
      }
      if (xml.startsWith('<?', i)) {
        const end = xml.indexOf('?>', i);
        if (end === -1) break;
        const inner = xml.slice(i + 2, end);
        const isDeclaration = inner.startsWith('xml');
        tokens.push({ kind: TokenKind.Declaration, name: '', attributes: {}, text: inner });
        i = end + 2;
        if (isDeclaration) {
          const last = tokens[tokens.length - 1];
          last.kind = TokenKind.Declaration;
        }
        continue;
      }
      i += 1;
      if (xml[i] === '/') {
        i += 1;
        const name = readName();
        tokens.push({ kind: TokenKind.CloseTag, name, attributes: {}, text: '' });
        while (i < len && xml[i] !== '>') i += 1;
        i += 1;
        continue;
      }
      const name = readName();
      const attributes = readAttributes();
      while (i < len && /\s/.test(xml[i])) i += 1;
      if (xml[i] === '/') {
        i += 1;
        tokens.push({ kind: TokenKind.SelfClose, name, attributes, text: '' });
        i += 1;
        continue;
      }
      if (xml[i] === '>') {
        i += 1;
        tokens.push({ kind: TokenKind.OpenTag, name, attributes, text: '' });
        continue;
      }
    } else {
      const start = i;
      let depth = 0;
      while (i < len) {
        if (xml[i] === '<') break;
        depth += 1;
        i += 1;
      }
      if (depth > 0) {
        tokens.push({ kind: TokenKind.Text, name: '', attributes: {}, text: xml.slice(start, i) });
      }
    }
  }

  return tokens;
}

export function parseXml(xml: string): XmlDocument {
  const tokens = tokenize(xml);
  const stack: XmlElement[] = [];
  const root: XmlElement = { name: '', attributes: {}, children: [], text: '' };

  const pushText = (element: XmlElement, text: string) => {
    if (element.children.length > 0) {
      const last = element.children[element.children.length - 1];
      if (!last.name) {
        last.text += text;
      }
    } else {
      element.text += text;
    }
  };

  for (const token of tokens) {
    switch (token.kind) {
      case TokenKind.OpenTag: {
        const element: XmlElement = { name: token.name, attributes: token.attributes, children: [], text: '' };
        const parent = stack[stack.length - 1] ?? root;
        parent.children.push(element);
        stack.push(element);
        break;
      }
      case TokenKind.SelfClose: {
        const element: XmlElement = { name: token.name, attributes: token.attributes, children: [], text: '' };
        const parent = stack[stack.length - 1] ?? root;
        parent.children.push(element);
        break;
      }
      case TokenKind.CloseTag: {
        stack.pop();
        break;
      }
      case TokenKind.Text: {
        const element = stack[stack.length - 1];
        if (element) pushText(element, token.text);
        break;
      }
      case TokenKind.CData: {
        const element = stack[stack.length - 1];
        if (element) pushText(element, token.text);
        break;
      }
      case TokenKind.Comment:
      case TokenKind.Declaration:
      case TokenKind.Processing:
        break;
    }
  }

  return { root };
}

export function localName(element: XmlElement): string {
  const colon = element.name.indexOf(':');
  return colon === -1 ? element.name : element.name.slice(colon + 1);
}

export function findChild(element: XmlElement, name: string): XmlElement | null {
  return element.children.find((c) => localName(c) === name) ?? null;
}

export function childText(element: XmlElement, name: string): string | null {
  const child = findChild(element, name);
  return child ? child.text.trim() : null;
}

export function childTextList(element: XmlElement, name: string): string[] {
  return element.children
    .filter((c) => localName(c) === name)
    .map((c) => c.text.trim())
    .filter(Boolean);
}