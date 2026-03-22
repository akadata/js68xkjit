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

(function testRunCommandReentersMonitor() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString('g f80008\r');
    state.machine.pollMonitor();

    assert.equal(state.uart.txString().indexOf('g f80008') !== -1, true, 'g command did not echo the typed command');
    assert.equal(/g f80008(?:\r?\n)?j68\n(?:\r?\n)?j68> \r?\n?$/.test(state.uart.txString()), true, 'g command did not rerun the ROM and reenter the monitor');
    assert.equal(state.machine.monitor.active, true, 'g command did not leave the monitor active');
})();

(function testLongRunCommandReentersMonitor() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString('gl f80008\r');
    state.machine.pollMonitor();

    assert.equal(state.uart.txString().indexOf('gl f80008') !== -1, true, 'gl command did not echo the typed command');
    assert.equal(/gl f80008(?:\r?\n)?j68\n(?:\r?\n)?j68> \r?\n?$/.test(state.uart.txString()), true, 'gl command did not rerun the ROM and reenter the monitor');
    assert.equal(state.machine.monitor.active, true, 'gl command did not leave the monitor active');
})();

(function testStepCommandExecutesOneInstruction() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString('t f80008\r');
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(output.indexOf('PC=00F8000E') !== -1, true, 't command did not advance PC by one instruction');
    assert.equal(output.indexOf('00F8000E: MOVE.L #$6A36380A,D0') !== -1, true, 't command did not show the next instruction');
    assert.equal(/j68> $/.test(output), true, 't command did not reissue the prompt');
})();

(function testUnsupportedGuestExecutionReturnsFaultAndPrompt() {
    var state = bootMonitorMachine();
    state.machine.write8(0x00090000, 0x00);
    state.machine.write8(0x00090001, 0xc1);
    state.uart.consumeTxString();
    state.uart.enqueueRxString('g 00090000\r' + 'r\r');
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(output.indexOf('FAULT PC=00090000 OP=00C1') !== -1, true, 'unsupported guest execution did not report fault PC/op');
    assert.equal(output.indexOf('SR=2700') !== -1, true, 'fault report did not include SR');
    assert.equal(output.indexOf('D0=6A36380A') !== -1, true, 'monitor did not survive fault and accept the next command');
    assert.equal(/j68> $/.test(output), true, 'fault path did not return to the prompt');
})();

console.log('monitor_exec.test.js: ok');
