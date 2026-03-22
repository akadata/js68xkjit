#!/usr/bin/env node

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var TestMachine = require('../../src/machine/test_machine');
var Uart = require('../../src/machine/devices/uart');
var assemble = require('./support/assemble_m68k');
var assembler = require('../../src/monitor/assembler');

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
        '; count to ten with labels',
        'a 00090000',
        'start:',
        'moveq #0,d0',
        '',
        'loop:',
        'addq.w #1,d0',
        'cmpi.w #10,d0',
        'bne loop',
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

(function testLoadAsmSupportsDbraAndDcB() {
    var state = bootMonitorMachine();
    var helloFile = path.join(sourceDir, 'hello_dbra.asm');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(helloFile, [
        'moveq #1,d7',
        'movea.l #$00de0000,a1',
        'line_loop:',
        'movea.l #message,a0',
        'char_loop:',
        'move.b (a0)+,d0',
        'beq line_done',
        'move.b d0,(a1)',
        'bra char_loop',
        'line_done:',
        'moveq #13,d0',
        'move.b d0,(a1)',
        'moveq #10,d0',
        'move.b d0,(a1)',
        'dbra d7,line_loop',
        'monitor',
        'message:',
        "dc.b 'HI',0",
        ''
    ].join('\n'));

    state.uart.consumeTxString();
    state.uart.enqueueRxString(
        'loadasm 00090000 hello_dbra.asm\r' +
        'g 00090000\r'
    );
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(output.indexOf('LOADED ASM ') !== -1, true, 'dbra/dc.b source did not assemble');
    assert.equal(output.indexOf('HI\r\nHI\r\n') !== -1, true, 'dbra/dc.b source did not print the expected text twice');

    fs.rmSync(helloFile, { force: true });
})();

(function testLoadAsmSupportsDcWAndDcL() {
    var state = bootMonitorMachine();
    var dataFile = path.join(sourceDir, 'data_demo.asm');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(dataFile, [
        'movea.l #table,a0',
        'monitor',
        'table:',
        'dc.w $1234,$ABCD',
        'dc.l $89ABCDEF,1',
        ''
    ].join('\n'));

    state.uart.consumeTxString();
    state.uart.enqueueRxString(
        'loadasm 00090000 data_demo.asm\r' +
        'g 00090000\r' +
        'r\r' +
        'm 00090008\r'
    );
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(output.indexOf('LOADED ASM 20 data_demo.asm END=00090014') !== -1, true, 'dc.w/dc.l source did not assemble to the expected size');
    assert.equal(output.indexOf('A0=00090008') !== -1, true, 'dc.w/dc.l source did not load the table address into A0');
    assert.equal(output.indexOf('00090008: 12 34 AB CD 89 AB CD EF 00 00 00 01') !== -1, true, 'dc.w/dc.l source did not emit the expected data bytes');

    fs.rmSync(dataFile, { force: true });
})();

(function testAssembleTextSupportsJsrLabel() {
    var source = [
        'moveq #0,d0',
        'jsr subr',
        'monitor',
        'subr:',
        'addq.w #1,d0',
        'rts',
        ''
    ].join('\n');
    var result = assembler.assembleText(0x00090000, source);
    assert.equal(result.length, 14, 'jsr label source did not assemble to the expected size');
    assert.equal(result.bytes[2], 0x4e, 'jsr label source did not encode JSR');
    assert.equal(result.bytes[3], 0xb9, 'jsr label source did not encode absolute-long JSR');
})();

console.log('monitor_loadasm.test.js: ok');
