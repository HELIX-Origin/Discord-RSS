import { describe, expect, it } from 'vitest';
import { parseXml, findChild, childText, childTextList, localName } from '../../../src/feed/xml.js';

describe('xml', () => {
  it('parses a simple document', () => {
    const doc = parseXml('<root><child>text</child></root>');
    expect(doc.root.name).toBe('root');
    expect(childText(doc.root, 'child')).toBe('text');
  });

  it('decodes numeric entities in text', () => {
    const doc = parseXml('<root>&#60;hello&#62;</root>');
    expect(doc.root.text).toBe('<hello>');
  });

  it('decodes named entities in attributes', () => {
    const doc = parseXml('<root attr="&amp;&quot;"></root>');
    expect(doc.root.attributes['attr']).toBe('&"');
  });

  it('extracts local names', () => {
    expect(localName({ name: 'atom:title', attributes: {}, children: [], text: '' })).toBe('title');
    expect(localName({ name: 'title', attributes: {}, children: [], text: '' })).toBe('title');
  });

  it('finds children by local name', () => {
    const doc = parseXml('<root xmlns:foo="x"><foo:bar>baz</foo:bar></root>');
    expect(findChild(doc.root, 'bar')?.text).toBe('baz');
  });

  it('collects text from multiple children', () => {
    const doc = parseXml('<root><tag>a</tag><tag>b</tag></root>');
    expect(childTextList(doc.root, 'tag')).toEqual(['a', 'b']);
  });

  it('ignores comments and declarations', () => {
    const doc = parseXml('<?xml version="1.0"?><!-- comment --><root/>');
    expect(doc.root.name).toBe('root');
  });
});
