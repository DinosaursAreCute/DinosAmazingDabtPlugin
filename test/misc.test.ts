import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pageLinks } from '../src/callbackRefs';
import { parseFunctionDefs } from '../src/shellFunctions';
import { parseValidatorOutput } from '../src/xmlValidator';

test('parseFunctionDefs finds name() and function name forms', () => {
    const defs = parseFunctionDefs('a() {\n  :\n}\nfunction b {\n}\nfunction c() {\n}\n  indented() {\n');
    assert.deepEqual(defs.map((d) => [d.name, d.line]), [['a', 0], ['b', 3], ['c', 5]]);
});

test('pageLinks resolves existing scripts and callback attribute values', () => {
    const text = '<tui><script src="x_callbacks.sh"/><button id="b" action="do_it now" pane="p"/><button id="c" action="{{f}}"/></tui>';
    const links = pageLinks(text, '/app', new Set(['action']), (p) => p === '/app/x_callbacks.sh');
    assert.deepEqual(links.scripts, ['/app/x_callbacks.sh']);
    assert.deepEqual(links.refs.map((r) => r.fn), ['do_it']);
    assert.equal(text.slice(links.refs[0].start, links.refs[0].end), 'do_it now');
});

test('parseValidatorOutput reads tab separated findings and drops junk', () => {
    const out = parseValidatorOutput('error\t/a.xml\t2\t3\t<pane> is missing\twith tab\nnoise\nwarning\t/a.xml\t5\t1\tmsg\n');
    assert.deepEqual(out.map((f) => [f.severity, f.line, f.col]), [['error', 2, 3], ['warning', 5, 1]]);
    assert.equal(out[0].message, '<pane> is missing\twith tab');
});
