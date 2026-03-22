#!/usr/bin/env node

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var TestMachine = require('../../src/machine/test_machine');
var Uart = require('../../src/machine/devices/uart');
var assemble = require('./support/assemble_m68k');

var sourceDir = path.resolve(__dirname, '../../source');
var sourceFile = path.join(sourceDir, 'counter.asm');

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

(function testLoadAsmSourceAndRun() {
    var state = bootMonitorMachine();
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(sourceFile, [
        '; count to ten',
        'moveq #0,d0',
        '',
        'addq.w #1,d0',
        'cmpi.w #10,d0',
        'bne 00090002',
        'monitor',
        ''
    ].join('\n'));

    state.uart.consumeTxString();
    state.uart.enqueueRxString(
        'loadasm 00090000 counter.asm\r' +
        'u 00090000\r' +
        'g 00090000\r' +
        'r\r'
    );
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(output.indexOf('LOADED ASM 14 counter.asm END=0009000E') !== -1, true, 'loadasm did not report byte count/end address');
    assert.equal(output.indexOf('00090000: MOVEQ #0,D0') !== -1, true, 'disassembly missing MOVEQ after loadasm');
    assert.equal(output.indexOf('00090008: BNE.W $00090002') !== -1, true, 'disassembly missing branch after loadasm');
    assert.equal(output.indexOf('RUN LIMIT') === -1, true, 'loaded asm did not return to the monitor');
    assert.equal(output.indexOf('D0=0000000A') !== -1, true, 'loaded asm did not leave D0 at 10');

    fs.rmSync(sourceFile, { force: true });
})();

console.log('monitor_loadasm.test.js: ok');
