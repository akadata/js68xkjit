#!/usr/bin/env node

var assert = require('assert');
var path = require('path');
var TestMachine = require('../../src/machine/test_machine');
var Uart = require('../../src/machine/devices/uart');
var assemble = require('./support/assemble_m68k');

var cpuType = process.env.J68_CPU_TYPE || '68000';

var bootMonitorMachine = require('./support/boot_machine').bootMonitorMachine;

(function testDisassembleCommand() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString('u f80008\r');
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(output.indexOf('00F80008: MOVEA.L #$00DE0000,A0') !== -1, true, 'u command did not decode MOVEA.L');
    assert.equal(output.indexOf('00F8000E: MOVE.L #$6A36380A,D0') !== -1, true, 'u command did not decode MOVE.L immediate');
    assert.equal(output.indexOf('00F80014: MOVE.L D0,(A0)') !== -1, true, 'u command did not decode MOVE.L register to memory');
    assert.equal(output.indexOf('00F80016: MONITOR') !== -1, true, 'u command did not decode the monitor service trap');
    assert.equal(output.indexOf('00F80018: BRA.S $00F80018') !== -1, true, 'u command did not decode the idle loop');
    assert.equal(/j68> $/.test(output), true, 'u command did not reissue the prompt');
})();

console.log('monitor_disasm.test.js: ok');
