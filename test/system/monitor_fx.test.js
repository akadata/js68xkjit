#!/usr/bin/env node

var assert = require('assert');
var path = require('path');
var TestMachine = require('../../src/machine/test_machine');
var Uart = require('../../src/machine/devices/uart');
var assemble = require('./support/assemble_m68k');

function bootMonitorMachine() {
    var machine = new TestMachine({
        rom: assemble.assembleToBinary(path.join(__dirname, '../../rom/monitor.S')),
        chipRamSize: 0x00200000,
        fastRamSize: 0x00400000,
        overlay: true,
        cpuType: '68000'
    });
    var uart = new Uart();
    machine.mapDevice(uart.region());
    machine.attachMonitor(uart);
    machine.reset();
    machine.runBlocks(1);
    return { machine: machine, uart: uart };
}

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
