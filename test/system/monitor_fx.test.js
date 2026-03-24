#!/usr/bin/env node

var assert = require('assert');
var path = require('path');
var TestMachine = require('../../src/machine/test_machine');
var Uart = require('../../src/machine/devices/uart');
var assemble = require('./support/assemble_m68k');

var cpuType = process.env.J68_CPU_TYPE || '68000';

var bootMonitorMachine = require('./support/boot_machine').bootMonitorMachine;

(function testFixedPointFormatting() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.machine.cpu.context.d[0] = 0x0003243C;
    state.uart.enqueueRxString('fx d0\r');
    state.machine.pollMonitor();
    var output = state.uart.txString();
    assert.equal(output.indexOf('D0 = 0003243C = 3.14154 (16.16)') !== -1, true, 'fx did not render 16.16 output');
})();

console.log('monitor_fx.test.js: ok');