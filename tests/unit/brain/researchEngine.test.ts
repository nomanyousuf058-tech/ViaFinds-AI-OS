/**
 * PHASE 4.2 — UNIT (research helpers)
 *
 * Deterministic, offline behaviour of the grounding layer: how a source ID is
 * derived, how a model response is parsed, and how sources are rendered into a
 * prompt. These are the pieces that decide whether a claim can legitimately be
 * attributed to a real source, so they are unit-tested in isolation.
 */
import { deriveSourceId, parseStrictJson, renderSourcesForPrompt } from '@/lib/brain/researchEngine';

describe('deriveSourceId', () => {
  it('is stable for the same URL', () => {
    expect(deriveSourceId('https://www.notion.so/product')).toBe(deriveSourceId('https://www.notion.so/product'));
  });

  it('collapses scheme case, www, and a trailing slash to the same source', () => {
    const canonical = deriveSourceId('https://www.notion.so/product');
    expect(deriveSourceId('HTTPS://WWW.notion.so/product/')).toBe(canonical);
    expect(deriveSourceId('  https://notion.so/product  ')).toBe(canonical);
  });

  it('keeps the query string distinct, because tracking params change the document', () => {
    expect(deriveSourceId('https://notion.so/product?utm_source=x')).not.toBe(deriveSourceId('https://notion.so/product'));
  });

  it('namespaces ids so they cannot collide with a primary key elsewhere', () => {
    expect(deriveSourceId('https://notion.so/product')).toMatch(/^src_[0-9a-f]{20}$/);
  });

  it('still produces an id for a value that is not a URL', () => {
    expect(deriveSourceId('not a url')).toMatch(/^src_[0-9a-f]{20}$/);
  });
});

describe('renderSourcesForPrompt', () => {
  it('renders numbered, attributable source lines', () => {
    const rendered = renderSourcesForPrompt([
      { source_id: 'src_1', title: 'Notion pricing', url: 'https://notion.so/pricing', snippet: 'Free for one person' },
    ] as never);

    expect(rendered).toMatch(/\[SOURCE 1\]/);
    expect(rendered).toMatch(/Notion pricing/);
    expect(rendered).toMatch(/https:\/\/notion\.so\/pricing/);
  });

  it('renders an explicit empty marker when there is nothing real to cite', () => {
    const rendered = renderSourcesForPrompt([]);
    expect(rendered).toMatch(/no sources/i);
  });
});

describe('parseStrictJson', () => {
  it('parses a bare JSON object', () => {
    expect(parseStrictJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips a fenced code block', () => {
    expect(parseStrictJson<{ a: number }>('```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });

  it('recovers an object embedded in prose', () => {
    expect(parseStrictJson<{ a: number }>('Here you go: {"a":3} hope that helps')).toEqual({ a: 3 });
  });

  it('throws rather than inventing a value when nothing parses', () => {
    expect(() => parseStrictJson('no json at all')).toThrow(/invalid JSON/i);
  });
});
