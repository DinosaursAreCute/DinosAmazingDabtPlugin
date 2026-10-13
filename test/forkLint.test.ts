import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findForkCalls } from '../src/forkLint';
import { maskLine } from '../src/shellMask';

const commands = (line: string) => findForkCalls(maskLine(line).code).map((f) => f.command);

test('flags external commands with a builtin equivalent', () => {
    assert.deepEqual(commands('name=$(basename "$f")'), ['basename']);
    assert.deepEqual(commands('cat x | sed s/a/b/'), ['sed']);
    assert.deepEqual(commands('if x; then date; fi'), ['date']);
    assert.deepEqual(commands('d=$(dirname "$p")'), ['dirname']);
});

test('flags $(echo ...) and $(printf ...)', () => {
    assert.deepEqual(commands('v=$(echo "$a")'), ['$(echo']);
    assert.deepEqual(commands('v=$(printf %s "$a")'), ['$(printf']);
});

test('ignores the words in arguments, strings and comments', () => {
    assert.deepEqual(commands('tui.log "run sed now"'), []);
    assert.deepEqual(commands('local date_fmt=1'), []);
    assert.deepEqual(commands('x=1 # basename here'), []);
    assert.deepEqual(commands('echo sed'), []);
});

test('reported range covers the command word', () => {
    const line = 'x=$(basename "$f")';
    const [hit] = findForkCalls(maskLine(line).code);
    assert.equal(line.slice(hit.start, hit.start + hit.length), 'basename');
});
