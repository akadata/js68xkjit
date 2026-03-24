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

(function testBenchmarkCommandReportsSaneOutput() {
    var state = bootMonitorWithTimer();
    state.uart.consumeTxString();
    state.timer.control = 0x07;
    state.timer.reload = 10;
    state.timer.count = 10;
    state.uart.enqueueRxString('bench 1\r');
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(/BENCH1 REG-LOOP COUNT=\d+ HOST_US=\d+ VIRT_TICKS=\d+/.test(output), true, 'bench command did not report timing header');
    assert.equal(/EST_INS=\d+ ACT_INS=\d+ APPROX_MIPS=\d+\.\d+/.test(output), true, 'bench command did not report instruction estimates');
    assert.equal(/j68> $/.test(output), true, 'bench command did not reissue the prompt');

    var lines = output.trimEnd().split('\n');
    console.log(lines[0]);
    console.log(lines[1]);
})();

console.log('monitor_bench.test.js: ok');