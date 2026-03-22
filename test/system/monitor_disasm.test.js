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
    return {
        machine: machine,
        uart: uart
    };
}

(function testDisassembleCommand() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString('u f80008\r');
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(output.indexOf('00F80008: MOVEA.L #$00DE0000,A0') !== -1, true, 'u command did not decode MOVEA.L');
    assert.equal(output.indexOf('00F8000E: MOVE.L #$6A36380A,D0') !== -1, true, 'u command did not decode MOVE.L immediate');
    assert.equal(output.indexOf('00F80014: MOVE.L D0,(A0)') !== -1, true, 'u command did not decode MOVE.L register to memory');
    assert.equal(output.indexOf('00F80016: MONITOR') !== -1, true, 'u command did not decode the monitor service trap');
    assert.equal(output.indexOf('00F80018: BRA.S $00F80018') !== -1, true, 'u command did not decode the idle loop');
    assert.equal(/j68> $/.test(output), true, 'u command did not reissue the prompt');
})();

console.log('monitor_disasm.test.js: ok');
