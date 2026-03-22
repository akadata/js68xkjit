#!/usr/bin/env node

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var TestMachine = require('../../src/machine/test_machine');
var Uart = require('../../src/machine/devices/uart');
var assemble = require('./support/assemble_m68k');

var sourceDir = path.resolve(__dirname, '../../source');
var sourceFile = path.join(sourceDir, 'saved_count10.asm');
var helloFile = path.join(sourceDir, 'saved_helloworld.asm');

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

(function testSaveAsmRoundTrip() {
    var state = bootMonitorMachine();
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.rmSync(sourceFile, { force: true });

    state.uart.consumeTxString();
    state.uart.enqueueRxString(
        'loadasm 00090000 count10.asm\r' +
        'saveasm 00090000 0E saved_count10.asm\r' +
        'm 00090000=4E 71 A0 00\r' +
        'loadasm 00090000 saved_count10.asm\r' +
        'g 00090000\r' +
        'r\r'
    );
    state.machine.pollMonitor();

    var output = state.uart.txString();
    var saved = fs.readFileSync(sourceFile, 'utf8');
    assert.equal(output.indexOf('SAVED ASM 14 saved_count10.asm') !== -1, true, 'saveasm did not report byte count');
    assert.equal(saved.indexOf('a 00090000') !== -1, true, 'saveasm did not preserve origin');
    assert.equal(saved.indexOf('moveq #0,d0') !== -1, true, 'saveasm did not emit moveq');
    assert.equal(saved.indexOf('bne.w $00090002') !== -1, true, 'saveasm did not emit branch');
    assert.equal(output.indexOf('D0=0000000A') !== -1, true, 'saved source did not round-trip and run');

    fs.rmSync(sourceFile, { force: true });
})();

(function testSaveAsmPreservesTrailingStringData() {
    var state = bootMonitorMachine();
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.rmSync(helloFile, { force: true });

    state.uart.consumeTxString();
    state.uart.enqueueRxString(
        'loadasm 00090000 helloworld.asm\r' +
        'saveasm 00090000 34 saved_helloworld.asm\r'
    );
    state.machine.pollMonitor();

    var output = state.uart.txString();
    var saved = fs.readFileSync(helloFile, 'utf8');
    assert.equal(output.indexOf('SAVED ASM 52 saved_helloworld.asm') !== -1, true, 'saveasm did not report saved helloworld source');
    assert.equal(saved.indexOf("dc.b 'HELLO WORLD',$00") !== -1, true, 'saveasm did not preserve trailing string data as dc.b');
    assert.equal(saved.indexOf('addq.w #1,d4') === -1, true, 'saveasm still mis-decoded string data as code');

    fs.rmSync(helloFile, { force: true });
})();

console.log('monitor_saveasm.test.js: ok');
