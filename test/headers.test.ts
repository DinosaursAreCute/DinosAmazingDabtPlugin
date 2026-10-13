import assert from 'node:assert/strict';
import { test } from 'node:test';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { render, versionFile } = require('../scripts/gen-headers');

test('one colour per letter, cycled through the palette', () => {
    const svg: string = render('AB', 7, ['#111111', '#222222']);
    assert.ok(svg.includes('fill="#111111"') && svg.includes('fill="#222222"'));
    assert.ok(!render('ABC', 7, ['#111111', '#222222']).includes('#333333'));
});

test('height is five cells and width follows the glyphs', () => {
    // I is 3 wide: width = 3 cells * 7 px
    assert.match(render('I', 7, ['#000000']), /width="21" height="35"/);
});

test('characters without a glyph are dropped, empty text gives nothing', () => {
    assert.equal(render('@#', 7, ['#000000']), undefined);
    assert.equal(render('a', 7, ['#000000']), render('A', 7, ['#000000']));
});

test('version title file name', () => {
    assert.ok(versionFile('0.2.0').endsWith('v0-2-0.svg'));
});
