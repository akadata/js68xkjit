#!/usr/bin/env node

var assert = require('assert');
var path = require('path');
var TestMachine = require('../../src/machine/test_machine');
var Uart = require('../../src/machine/devices/uart');
var assemble = require('./support/assemble_m68k');

var cpuType = process.env.J68_CPU_TYPE || '68000';

var bootMonitorMachine = require('./support/boot_machine').bootMonitorMachine;

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

(function testDisassembleListingCommandOnSpeechSource() {
    var state = bootMonitorMachine({
        sound: true,
        timer: true,
        soundOptions: { backend: 'null', sampleRate: 8000, baseHz: 32768 },
        timerOptions: { defaultReload: 1, baseHz: 32768 }
    });
    state.uart.consumeTxString();
    state.uart.enqueueRxString(
        'loadasm 00090000 speech.asm\r' +
        'd 00090000 12\r'
    );
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(output.indexOf('LOADED ASM ') !== -1, true, 'speech.asm did not load');
    assert.equal(output.indexOf('00090000: MOVEA.L #$00DE1000,A1') !== -1, true, 'd command did not decode speech setup movea');
    assert.equal(output.indexOf('MOVE.W #$00FF,$0006(A1)') !== -1, true, 'd command did not decode speech master volume write');
    assert.equal(output.indexOf('MOVEA.L #$00DE0010,A2') !== -1, true, 'd command did not decode speech timer base setup');
    assert.equal(output.indexOf('DC.W') === -1, true, 'd command fell back to DC.W too early on speech');
    assert.equal(/j68> $/.test(output), true, 'd command did not reissue the prompt');
})();

(function testDisassembleDbraLoopInstruction() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString(
        'loadasm 00090000 count10.asm\r' +
        'd 00090000 6\r'
    );
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(output.indexOf('DBRA') === -1, true, 'count10 should not contain DBRA');

    state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString(
        'loadasm 00090000 hello10.asm\r' +
        'd 00090000 20\r'
    );
    state.machine.pollMonitor();

    output = state.uart.txString();
    assert.equal(output.indexOf('DBRA D7,') !== -1, true, 'd command did not decode DBRA');
})();

console.log('monitor_disasm.test.js: ok');
