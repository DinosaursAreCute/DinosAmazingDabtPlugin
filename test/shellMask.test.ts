import assert from 'node:assert/strict';
import { test } from 'node:test';
import { maskLine } from '../src/shellMask';

test('comment tail is blanked, code before it kept, length preserved', () => {
    const line = 'echo hi # echo -e now';
    const v = maskLine(line);
    assert.equal(v.noComment.length, line.length);
    assert.equal(v.noComment, 'echo hi ' + ' '.repeat(line.length - 8));
});

test('# inside ${#v}, $# and a word is not a comment', () => {
    for (const line of ['n=${#v}', 'echo $#', 'x=a#b']) assert.equal(maskLine(line).noComment, line);
});

test('single-quoted text is blanked in both views, double-quoted only in code', () => {
    const v = maskLine(`a 'echo -e' "echo -e" b`);
    assert.equal(v.noComment, `a 'xxxxxxx' "echo -e" b`);
    assert.equal(v.code, `a 'xxxxxxx' "xxxxxxx" b`);
});

test('escaped quote does not end the string', () => {
    const v = maskLine('echo "a\\"b # c" # tail');
    assert.ok(v.noComment.includes('# c'));
    assert.ok(!v.noComment.includes('tail'));
});
