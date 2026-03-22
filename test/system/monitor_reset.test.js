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
    machine.mapDevice(uart);
    machine.attachMonitor(uart);
    machine.reset();
    machine.runBlocks(1);
    return {
        machine: machine,
        uart: uart
    };
}

(function testResetCommandRebootsIntoRomMonitor() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString('reset\r');
    state.machine.pollMonitor();

    assert.equal(state.uart.txString().indexOf('j68\nj68> ') !== -1, true, 'reset command did not reboot back into the ROM monitor');
})();

console.log('monitor_reset.test.js: ok');
