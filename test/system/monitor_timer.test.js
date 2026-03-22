#!/usr/bin/env node

var assert = require('assert');
var path = require('path');
var TestMachine = require('../../src/machine/test_machine');
var Uart = require('../../src/machine/devices/uart');
var Intc = require('../../src/machine/devices/intc');
var Timer = require('../../src/machine/devices/timer');
var assemble = require('./support/assemble_m68k');

var cpuType = process.env.J68_CPU_TYPE || '68000';

var bootMonitorWithTimer = require('./support/boot_machine').bootMonitorWithTimer;

(function testInterruptStateCommand() {
    var state = bootMonitorWithTimer();
    state.uart.consumeTxString();
    state.timer.control = 0x07;
    state.timer.count = 0x20;
    state.timer.reload = 0x40;
    state.timer.ticks = 3;
    state.timer.pending = true;
    state.intc.pending = 0x00000004;
    state.intc.mask = 0x0000007f;
    state.uart.enqueueRxString('i\r');
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(output.indexOf('TICKS=00000003 COUNT=00000020 RELOAD=00000040') !== -1, true, 'i command did not report timer counters');
    assert.equal(output.indexOf('CTRL=07 STATUS=03 PENDING=00000004 MASK=0000007F') !== -1, true, 'i command did not report interrupt state');
    assert.equal(/j68> $/.test(output), true, 'i command did not reissue the prompt');
})();

(function testTimerReloadCommand() {
    var state = bootMonitorWithTimer();
    state.uart.consumeTxString();
    state.uart.enqueueRxString('ti 20\r');
    state.machine.pollMonitor();

    assert.equal(state.timer.reload >>> 0, 0x20, 'ti command did not update reload');
    assert.equal(state.timer.count >>> 0, 0x20, 'ti command did not synchronize count with reload');
    assert.equal(state.uart.txString().indexOf('RELOAD=00000020 COUNT=00000020') !== -1, true, 'ti command did not report the new reload');
})();

(function testTimerEnableCommand() {
    var state = bootMonitorWithTimer();
    state.uart.consumeTxString();
    state.timer.control = 0x06;
    state.uart.enqueueRxString('te 1\r');
    state.machine.pollMonitor();

    assert.equal(state.timer.control, 0x07, 'te 1 did not set the enable bit');
    assert.equal(state.uart.txString().indexOf('CTRL=07 STATUS=02') !== -1, true, 'te 1 did not report enabled timer state');

    state.uart.consumeTxString();
    state.uart.enqueueRxString('te 0\r');
    state.machine.pollMonitor();
    assert.equal(state.timer.control, 0x06, 'te 0 did not clear the enable bit');
    assert.equal(state.uart.txString().indexOf('CTRL=06 STATUS=00') !== -1, true, 'te 0 did not report disabled timer state');
})();

(function testInterruptMaskCommand() {
    var state = bootMonitorWithTimer();
    state.uart.consumeTxString();
    state.uart.enqueueRxString('tm 04\r');
    state.machine.pollMonitor();

    assert.equal(state.intc.mask >>> 0, 0x04, 'tm command did not update the interrupt mask');
    assert.equal(state.uart.txString().indexOf('MASK=00000004') !== -1, true, 'tm command did not report the new mask');
})();

console.log('monitor_timer.test.js: ok');
