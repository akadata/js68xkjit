#!/usr/bin/env node

var assert = require('assert');
var path = require('path');
var TestMachine = require('../../src/machine/test_machine');
var Uart = require('../../src/machine/devices/uart');
var assemble = require('./support/assemble_m68k');

var cpuType = process.env.J68_CPU_TYPE || '68000';

var bootMonitorMachine = require('./support/boot_machine').bootMonitorMachine;

(function testPromptAppearsAfterBootBanner() {
    var state = bootMonitorMachine();
    assert.equal(state.uart.txString(), 'j68\nj68> ', 'monitor prompt did not follow the boot banner');
    assert.equal(state.machine.monitor.active, true, 'monitor did not become active');
})();

(function testRegisterDumpCommand() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString('r\r');
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(output.indexOf('D0=6A36380A D1=00000000') !== -1, true, 'r command did not dump data registers');
    assert.equal(output.indexOf('A0=00DE0000') !== -1, true, 'r command did not dump A0');
    assert.equal(output.indexOf('A7=001FFFC0') !== -1, true, 'r command did not dump the stack pointer');
    assert.equal(output.indexOf('PC=00F80018 SR=2700') !== -1, true, 'r command did not dump PC/SR');
    assert.equal(/j68> $/.test(output), true, 'r command did not reissue the prompt');
})();

(function testMemoryExamineCommand() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString('m f80000\r');
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(
        output.indexOf('00F80000: 00 1F FF C0 00 F8 00 08 20 7C 00 DE 00 00 20 3C') !== -1,
        true,
        'm command did not dump the expected ROM bytes'
    );
    assert.equal(/j68> $/.test(output), true, 'm command did not reissue the prompt');
})();

console.log('monitor.test.js: ok');