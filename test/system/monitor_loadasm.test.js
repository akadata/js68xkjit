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

var cpuType = process.env.J68_CPU_TYPE || '68000';

var bootMonitorMachine = require('./support/boot_machine').bootMonitorMachine;

(function testLoadAsmSourceAndRun() {
    var state = bootMonitorMachine();
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(sourceFile, [
        '; count to ten',
        'moveq #0,d0',
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

(function testAssembleTextSupportsBcdInstructions() {
    var source = [
        'abcd d1,d2',
        'abcd -(a3),-(a4)',
        'sbcd d1,d2',
        'nbcd d0',
        ''
    ].join('\n');
    var result = assembler.assembleText(0x00090000, source);
    assert.deepEqual(Array.from(result.bytes), [
        0xc5, 0x01,
        0xc9, 0x0b,
        0x85, 0x01,
        0x48, 0x00
    ], 'BCD instruction source did not assemble to the expected opcodes');
})();

(function testAssembleTextSupportsAddxInstructions() {
    var source = [
        'addx.b d0,d1',
        'addx.w d2,d3',
        'addx.l d4,d5',
        'addx.b -(a0),-(a1)',
        'addx.w -(a2),-(a3)',
        'addx.l -(a4),-(a5)',
        ''
    ].join('\n');
    var result = assembler.assembleText(0x00090000, source);
    assert.deepEqual(Array.from(result.bytes), [
        0xd3, 0x00,
        0xd7, 0x42,
        0xdb, 0x84,
        0xd3, 0x08,
        0xd7, 0x4a,
        0xdb, 0x8c
    ], 'ADDX instruction source did not assemble to the expected opcodes');
})();

(function testExistingSourceProgramsRemainRelocatable() {
    [ 'count10.asm', 'hello10.asm', 'helloworld.asm', 'hello_uart.asm' ].forEach(function (name) {
        var text = fs.readFileSync(path.join(sourceDir, name), 'utf8');
        var low = assembler.assembleText(0x00090000, text);
        var high = assembler.assembleText(0x00091000, text);
        assert.equal(low.length, high.length, name + ' changed size when relocated');
        assert.equal(low.bytes.length, high.bytes.length, name + ' changed byte count when relocated');
    });
})();

(function testAssembleTextSupportsShiftRotateFamily() {
    var source = [
        'asl.b #1,d7',
        'asl (a2)',
        'asr $1234.w',
        'lsl.l d5,d6',
        'rol -(a4)',
        'roxr.b d1,d2',
        ''
    ].join('\n');
    var result = assembler.assembleText(0x00090000, source);
    assert.deepEqual(Array.from(result.bytes), [
        0xe3, 0x07,
        0xe1, 0xd2,
        0xe0, 0xf8, 0x12, 0x34,
        0xeb, 0xae,
        0xe7, 0xe4,
        0xe2, 0x32
    ], 'shift/rotate source did not assemble to the expected opcodes');
})();

(function testAssembleTextSupportsBitOperationsFamily() {
    var source = [
        'bchg #1,d2',
        'bchg d0,d2',
        'bchg #2,(a2)',
        'bclr #3,(a3)+',
        'bset d7,$1234.w',
        'btst #9,$12345678',
        ''
    ].join('\n');
    var result = assembler.assembleText(0x00090000, source);
    assert.deepEqual(Array.from(result.bytes), [
        0x08, 0x42, 0x00, 0x01,
        0x01, 0x42,
        0x08, 0x52, 0x00, 0x02,
        0x08, 0x9b, 0x00, 0x03,
        0x0f, 0xf8, 0x12, 0x34,
        0x08, 0x39, 0x00, 0x09, 0x12, 0x34, 0x56, 0x78
    ], 'bit operation source did not assemble to the expected opcodes');
})();

(function testAssembleTextSupportsSpeechSource() {
    var text = fs.readFileSync(path.join(sourceDir, 'speech.asm'), 'utf8');
    var result = assembler.assembleText(0x00090000, text);

    assert.equal(result.length > 0, true, 'speech.asm did not assemble');
    assert.equal(result.bytes.length, result.length, 'speech.asm byte count did not match reported length');
})();

(function testLoadAsmSpeechSourceRunsWithNullAudioBackend() {
    var state = bootMonitorMachine({
        sound: true,
        timer: true,
        soundOptions: {
            backend: 'null',
            sampleRate: 8000,
            baseHz: 32768
        },
        timerOptions: {
            defaultReload: 1,
            baseHz: 32768
        }
    });

    state.uart.consumeTxString();
    state.uart.enqueueRxString(
        'loadasm 00090000 speech.asm\r' +
        'gl 00090000\r'
    );
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(output.indexOf('LOADED ASM ') !== -1, true, 'speech.asm did not load in monitor');
    assert.equal(output.indexOf('FAULT ') === -1, true, 'speech.asm faulted when run with null audio backend');
    assert.equal(output.indexOf('RUN LIMIT') === -1, true, 'speech.asm exceeded monitor run budget');
})();

console.log('monitor_loadasm.test.js: ok');
