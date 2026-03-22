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

(function testAssembledLoopReturnsToMonitor() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString(
        'a 00090000\r' +
        'moveq #0,d0\r' +
        'addq.w #1,d0\r' +
        'cmpi.w #10,d0\r' +
        'bne 00090002\r' +
        'monitor\r' +
        '\r' +
        'u 00090000\r' +
        'g 00090000\r' +
        'r\r'
    );
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(output.indexOf('ASSEMBLY DONE') !== -1, true, 'assembler did not report exit cleanly');
    assert.equal(output.indexOf('00090004: CMPI.W #$000A,D0') !== -1, true, 'assembler immediate did not treat plain 10 as decimal');
    assert.equal(output.indexOf('00090008: BNE.W $00090002') !== -1, true, 'branch did not assemble/disassemble correctly');
    assert.equal(output.indexOf('RUN LIMIT') === -1, true, 'loop did not return to the monitor');
    assert.equal(output.indexOf('D0=0000000A') !== -1, true, 'loop did not stop at 10');
    assert.equal(/j68> $/.test(output), true, 'monitor did not return to the prompt');
})();

console.log('monitor_assemble_loop.test.js: ok');
