#!/usr/bin/env node

var assert = require('assert');
var path = require('path');
var TestMachine = require('../../src/machine/test_machine');
var Uart = require('../../src/machine/devices/uart');
var assemble = require('./support/assemble_m68k');

var cpuType = process.env.J68_CPU_TYPE || '68000';

var bootMonitorMachine = require('./support/boot_machine').bootMonitorMachine;

(function testPutHexBinary() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString(
        'load 00090000 puthex.bin\r' +
        'g 00090000\r'
    );
    state.machine.pollMonitor();
    var output = state.uart.txString();
    assert.equal(output.indexOf('1234ABCD\r\n') !== -1, true, 'puthex.bin did not print expected hex text');
})();

(function testPrintPi16Binary() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString(
        'load 00090000 print_pi16.bin\r' +
        'g 00090000\r'
    );
    state.machine.pollMonitor();
    var output = state.uart.txString();
    assert.equal(output.indexOf('3.14154\r\n') !== -1, true, 'print_pi16.bin did not print expected pi text');
})();

(function testCooperativeDemoBinary() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString(
        'load 00090000 coop_demo.bin\r' +
        'g 00090000\r'
    );
    state.machine.pollMonitor();
    var output = state.uart.txString();
    assert.equal(output.indexOf('ABABABABAB\r\n') !== -1, true, 'coop_demo.bin did not interleave the two tasks');
    assert.equal(/j68> $/.test(output), true, 'coop_demo.bin did not return to the monitor prompt');
})();

(function testPrintStatusBinary() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString(
        'load 00090000 print_status.bin\r' +
        'g 00090000\r'
    );
    state.machine.pollMonitor();
    var output = state.uart.txString();
    assert.equal(output.indexOf('D0=1234ABCD\r\n') !== -1, true, 'print_status.bin did not print D0 line');
    assert.equal(output.indexOf('PI16=0003243C\r\n') !== -1, true, 'print_status.bin did not print PI16 line');
})();

console.log('monitor_program_output.test.js: ok');
