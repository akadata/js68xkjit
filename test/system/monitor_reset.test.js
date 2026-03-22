#!/usr/bin/env node

var assert = require('assert');
var path = require('path');
var TestMachine = require('../../src/machine/test_machine');
var Uart = require('../../src/machine/devices/uart');
var assemble = require('./support/assemble_m68k');

var cpuType = process.env.J68_CPU_TYPE || '68000';

var bootMonitorMachine = require('./support/boot_machine').bootMonitorMachine;

(function testResetCommandRebootsIntoRomMonitor() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString('reset\r');
    state.machine.pollMonitor();

    assert.equal(state.uart.txString().indexOf('j68\nj68> ') !== -1, true, 'reset command did not reboot back into the ROM monitor');
})();

console.log('monitor_reset.test.js: ok');
