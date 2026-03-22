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

console.log('monitor_line_editor.test.js: ok');
