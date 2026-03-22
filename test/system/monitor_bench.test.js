#!/usr/bin/env node

var assert = require('assert');
var path = require('path');
var TestMachine = require('../../src/machine/test_machine');
var Uart = require('../../src/machine/devices/uart');
var Intc = require('../../src/machine/devices/intc');
var Timer = require('../../src/machine/devices/timer');
var assemble = require('./support/assemble_m68k');

function bootMonitorWithTimer() {
    var machine = new TestMachine({
        rom: assemble.assembleToBinary(path.join(__dirname, '../../rom/monitor.S')),
        chipRamSize: 0x00200000,
        fastRamSize: 0x00400000,
        overlay: true,
        cpuType: '68000'
    });
    var uart = new Uart();
    var intc = new Intc();
    var timer = new Timer({ irqLevel: 2, defaultReload: 10 });

    machine.mapDevice(uart.region());
    machine.attachIntc(intc);
    machine.attachTimer(timer);
    machine.attachMonitor(uart);
    machine.reset();
    machine.runBlocks(1);

    return {
        machine: machine,
        uart: uart,
        timer: timer
    };
}

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
