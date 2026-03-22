#!/usr/bin/env node

var assert = require('assert');
var path = require('path');
var TestMachine = require('../../src/machine/test_machine');
var Uart = require('../../src/machine/devices/uart');
var assemble = require('./support/assemble_m68k');

var cpuType = process.env.J68_CPU_TYPE || '68000';

var bootMonitorMachine = require('./support/boot_machine').bootMonitorMachine;

(function testEchoLineBinary() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString(
        'load 00090000 echo_line.bin\r' +
        'g 00090000\r' +
        'hello world\r'
    );
    state.machine.pollMonitor();
    var output = state.uart.txString();
    assert.equal(output.indexOf('INPUT> hello world\r\n') !== -1, true, 'echo_line.bin did not prompt and echo typed input');
    assert.equal(output.indexOf('ECHO: hello world\r\n') !== -1, true, 'echo_line.bin did not print echoed line');
})();

console.log('monitor_program_input.test.js: ok');
