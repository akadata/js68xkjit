#!/usr/bin/env node

var assert = require('assert');
var childProcess = require('child_process');
var path = require('path');

(function testInteractiveLauncherPrintsBannerPromptAndAcceptsCommands() {
    var output = childProcess.execFileSync('node', [ path.join(__dirname, '../../tools/monitor.js') ], {
        cwd: path.join(__dirname, '../..'),
        encoding: 'latin1',
        env: Object.assign({}, process.env, {
            J68_MONITOR_SCRIPT: 'r\\r',
            J68_MONITOR_EXIT_ON_MONITOR: '1'
        })
    });

    assert.equal(output.indexOf('j68\nj68> ') !== -1, true, 'interactive launcher did not print banner and prompt');
    assert.equal(output.indexOf('D0=6A36380A') !== -1, true, 'interactive launcher did not execute monitor command input');
})();

(function testInteractiveLauncherKeepsRunPromptOnNewLine() {
    var output = childProcess.execFileSync('node', [ path.join(__dirname, '../../tools/monitor.js') ], {
        cwd: path.join(__dirname, '../..'),
        encoding: 'latin1',
        env: Object.assign({}, process.env, {
            J68_MONITOR_SCRIPT: 'g f80008\\r',
            J68_MONITOR_EXIT_ON_MONITOR: '1'
        })
    });

    assert.equal(/g f80008(?:\r?\n)?j68\n(?:\r?\n)?j68> /.test(output), true, 'interactive launcher did not keep the rerun banner on a new line');
})();

(function testInteractiveLauncherAllowsGuestPollingInput() {
    var output = childProcess.execFileSync('node', [ path.join(__dirname, '../../tools/monitor.js') ], {
        cwd: path.join(__dirname, '../..'),
        encoding: 'latin1',
        env: Object.assign({}, process.env, {
            J68_MONITOR_SCRIPT: 'load 00090000 echo_line.bin\\rg 00090000\\rhello world\\r',
            J68_MONITOR_EXIT_ON_MONITOR: '1'
        })
    });

    assert.equal(output.indexOf('INPUT> hello world') !== -1, true, 'interactive launcher did not feed script input to polling guest');
    assert.equal(output.indexOf('ECHO: hello world') !== -1, true, 'interactive launcher did not echo guest input back');
})();

console.log('monitor_cli.test.js: ok');
