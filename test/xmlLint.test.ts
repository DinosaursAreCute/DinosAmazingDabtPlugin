import assert from 'node:assert/strict';
import { test } from 'node:test';
import { XsdElement } from '../src/types';
import { lintXml, XmlLintContext } from '../src/xmlLintCore';
import { scanXml } from '../src/xmlScan';
import { schemaIndex } from '../src/xsdData';

const ctx = (over: Partial<XmlLintContext> = {}): XmlLintContext => ({
    schema: (n) => schemaIndex.get(n),
    callbackAttrs: new Set(['action', 'on_visit']),
    isBuiltInCallback: (fn) => fn.startsWith('tui.'),
    scriptFunctions: new Set(['on_home']),
    fileExists: (p) => p === 'home_callbacks.sh',
    themeClasses: new Set(['title']),
    ...over,
});
const codes = (text: string, over?: Partial<XmlLintContext>) => lintXml(text, ctx(over)).map((f) => f.code);

test('scanXml nests elements and records attribute spans', () => {
    const text = '<tui><pane id="a"><label id="b" text="x > y"/></pane></tui>';
    const els = scanXml(text);
    assert.deepEqual(els.map((e) => e.name), ['tui', 'pane', 'label']);
    assert.deepEqual(els.map((e) => e.parent), [-1, 0, 1]);
    const label = els[2];
    const text_attr = label.attrs.find((a) => a.name === 'text')!;
    assert.equal(text.slice(text_attr.valueStart, text_attr.valueEnd), 'x > y');
    assert.equal(text.slice(els[1].start, els[1].end), '<pane id="a"><label id="b" text="x > y"/></pane>');
});

test('scanXml skips comments', () => {
    assert.deepEqual(scanXml('<tui><!-- <pane id="x"/> --></tui>').map((e) => e.name), ['tui']);
});

test('clean page has no findings', () => {
    assert.deepEqual(codes('<tui on_visit="on_home"><script src="home_callbacks.sh"/><pane id="a"/></tui>'), []);
});

test('unknown element and attribute', () => {
    assert.deepEqual(codes('<tui><bogus/></tui>'), ['dabt-xml-unknown-element']);
    assert.deepEqual(codes('<tui><pane id="a" nonsense="1"/></tui>'), ['dabt-xml-unknown-attribute']);
});

test('<component name="x"> makes <x> a known tag', () => {
    assert.deepEqual(codes('<tui><component name="card" src="home_callbacks.sh"/><card/></tui>'), []);
});

test('missing required attribute', () => {
    assert.deepEqual(codes('<tui><pane/></tui>'), ['dabt-xml-missing-attribute']);
});

test('callback must exist in the page scripts or the API; skipped without scripts', () => {
    const page = (fn: string) => `<tui><pane id="a"/><button id="b" action="${fn}" pane="a"/></tui>`;
    assert.ok(codes(page('nope')).includes('dabt-xml-undefined-callback'));
    assert.ok(!codes(page('on_home')).includes('dabt-xml-undefined-callback'));
    assert.ok(!codes(page('tui.quit')).includes('dabt-xml-undefined-callback'));
    assert.ok(!codes(page('nope'), { scriptFunctions: undefined }).includes('dabt-xml-undefined-callback'));
    assert.ok(!codes(page('{{fn}}')).includes('dabt-xml-undefined-callback'));
});

test('missing src file', () => {
    assert.ok(codes('<tui><script src="gone.sh"/></tui>').includes('dabt-xml-missing-file'));
});

test('duplicate id, but not across template or if branches', () => {
    assert.ok(codes('<tui><pane id="a"/><pane id="a"/></tui>').includes('dabt-xml-duplicate-id'));
    const branches = '<tui><if test="x"><pane id="a"/></if><else><pane id="a"/></else></tui>';
    assert.ok(!codes(branches).includes('dabt-xml-duplicate-id'));
});

test('unknown theme class is info severity and per token', () => {
    const f = lintXml('<tui><pane id="a" class="title nope"/></tui>', ctx());
    const cls = f.filter((x) => x.code === 'dabt-xml-unknown-class');
    assert.equal(cls.length, 1);
    assert.equal(cls[0].severity, 'info');
});

test('schema data is present', () => {
    const el: XsdElement | undefined = schemaIndex.get('pane');
    assert.ok(el && el.attributes.some((a) => a.name === 'id' && a.required));
});
