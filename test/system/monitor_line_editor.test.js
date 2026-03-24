#!/usr/bin/env node

var assert = require('assert');
var createLineEditor = require('../../tools/support/line_editor').createLineEditor;

(function testLineEditorSupportsMidLineInsertAndEchoSuppression() {
    var writes = [];
    var lines = [];
    var editor = createLineEditor({
        write: function (text) { writes.push(text); },
        onLine: function (line) { lines.push(line); }
    });

    editor.handleOutput('j68> ');
    editor.handleChunk('ab');
    editor.handleChunk('\x1b[D');
    editor.handleChunk('X');
    editor.handleChunk('\r');
    editor.handleOutput('aXb\r\nOK\r\nj68> ');

    assert.deepEqual(lines, [ 'aXb\r' ], 'line editor did not emit the edited line');
    var rendered = writes.join('').replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
    assert.equal(rendered.indexOf('j68> aXb\r\n') !== -1, true, 'line editor did not render the edited line locally');
    assert.equal(rendered.indexOf('OK\r\nj68> ') !== -1, true, 'line editor did not preserve later UART output');
    assert.equal(rendered.indexOf('aXb\r\naXb') === -1, true, 'line editor did not suppress echoed command text');
})();

(function testLineEditorSupportsHistoryRecall() {
    var lines = [];
    var editor = createLineEditor({
        write: function () {},
        onLine: function (line) { lines.push(line); }
    });

    editor.handleOutput('j68> ');
    editor.handleChunk('first\r');
    editor.handleOutput('OK\r\nj68> ');
    editor.handleChunk('\x1b[A\r');

    assert.deepEqual(lines, [ 'first\r', 'first\r' ], 'line editor did not recall the previous line from history');
})();

(function testLineEditorClearsGuestSidePartialInputWhenMonitorReturns() {
    var writes = [];
    var lines = [];
    var editor = createLineEditor({
        write: function (text) { writes.push(text); },
        onLine: function (line) { lines.push(line); }
    });

    editor.handleOutput('j68> ');
    editor.handleChunk('g 00180000\r');
    editor.handleOutput('ABCDEF');
    editor.handleChunk('A');
    editor.resetTransientInput();
    editor.handleOutput('\r\nj68> ');

    var rendered = writes.join('').replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
    assert.deepEqual(lines, [ 'g 00180000\r' ], 'line editor emitted unexpected guest input while returning to the monitor');
    assert.equal(rendered.indexOf('ABCDEF\r\nj68> A') === -1, true, 'line editor redrew stale guest input onto the monitor prompt');
    assert.equal(rendered.indexOf('Aj68>') === -1, true, 'line editor prefixed the prompt with stale guest input');
    assert.equal(editor._state.line, '', 'line editor did not clear the stale guest input buffer');
})();

console.log('monitor_line_editor.test.js: ok');