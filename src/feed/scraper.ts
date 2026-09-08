import type { HtmlElement } from './html.js';

export interface ScrapeSelectors {
  itemSelector: string;
  titleSelector: string;
  linkSelector: string;
  descriptionSelector?: string;
}

export interface ScrapedItem {
  title: string;
  url: string;
  description: string | null;
}

interface Selector {
  tag: string | null;
  id: string | null;
  classes: string[] | null;
}

function parseSelector(selector: string): Selector[] {
  return selector
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const m = raw.match(/^([a-z0-9-_]*)((?:#[a-zA-Z0-9_-]+)?)((?:\.[a-zA-Z0-9_-]+)*)$/i);
      if (!m) return null;
      return {
        tag: m[1] || null,
        id: m[2] ? m[2].slice(1) : null,
        classes: m[3] ? m[3].split('.').filter(Boolean) : null,
      } satisfies Selector;
    })
    .filter((s): s is Selector => s !== null);
}

function matches(el: HtmlElement, sel: Selector): boolean {
  if (sel.tag && el.tag !== sel.tag.toLowerCase()) return false;
  if (sel.id && el.attributes['id'] !== sel.id) return false;
  if (sel.classes) {
    const classes = (el.attributes['class'] ?? '').split(/\s+/).filter(Boolean);
    for (const c of sel.classes) {
      if (!classes.includes(c)) return false;
    }
  }
  return true;
}

function selectAll(root: HtmlElement, selector: string): HtmlElement[] {
  const parts = parseSelector(selector);
  let current = root.children.filter((c) => c.tag !== '#text');
  for (const part of parts) {
    const next: HtmlElement[] = [];
    for (const el of current) {
      if (matches(el, part)) next.push(el);
      next.push(...el.children.filter((c) => c.tag !== '#text'));
    }
    current = next;
  }
  return current;
}

function findHref(el: HtmlElement): string | null {
  if (el.attributes['href']) return el.attributes['href'];
  for (const child of el.children) {
    if (child.tag !== '#text') {
      const href = findHref(child);
      if (href) return href;
    }
  }
  return null;
}

export function scrapeItems(content: HtmlElement | null, selectors: ScrapeSelectors): ScrapedItem[] {
  if (!content) return [];
  const containers = selectAll(content, selectors.itemSelector);

  return containers
    .map((container) => {
      const titleEl = selectAll(container, selectors.titleSelector)[0];
      const title = titleEl ? titleEl.text : '';

      const linkEl = selectAll(container, selectors.linkSelector)[0];
      const url = linkEl ? findHref(linkEl) ?? '' : '';

      let description: string | null = null;
      if (selectors.descriptionSelector) {
        const descEl = selectAll(container, selectors.descriptionSelector)[0];
        description = descEl ? descEl.text : null;
      }

      if (!title && !url) return null;
      return { title, url, description };
    })
    .filter((x): x is ScrapedItem => x !== null);
}

export function absoluteUrl(base: string, href: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

export function discoverFeedLinks(root: HtmlElement, pageUrl: string): string[] {
  const links = selectAll(root, 'link');
  return links
    .filter((l) => {
      const type = l.attributes['type'];
      return type === 'application/rss+xml' || type === 'application/atom+xml' || type === 'application/rdf+xml';
    })
    .map((l) => absoluteUrl(pageUrl, l.attributes['href'] ?? ''))
    .filter((u) => u !== pageUrl);
}