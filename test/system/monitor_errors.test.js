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

(function testInvalidInputReturnsErrorsAndPrompt() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString('m 00090000=00m\r');
    state.uart.enqueueRxString('r q0=1\r');
    state.uart.enqueueRxString('save 00090000\r');
    state.uart.enqueueRxString('load 00090000 count10.asm\r');
    state.uart.enqueueRxString('wat\r');
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(output.indexOf('ERR invalid data token: 00m') !== -1, true, 'bad memory token did not return an error');
    assert.equal(output.indexOf('ERR invalid register assignment') !== -1, true, 'bad register assignment did not return an error');
    assert.equal(output.indexOf('ERR usage: save <addr> <len> <name>') !== -1, true, 'bad save syntax did not return an error');
    assert.equal(output.indexOf('ERR assembly source loads with loadasm from source/') !== -1, true, 'load of asm source did not return the source/ hint');
    assert.equal(output.indexOf('ERR unknown command') !== -1, true, 'unknown command did not return an error');
    assert.equal(/j68> $/.test(output), true, 'monitor did not return to the prompt after errors');
})();

(function testHelpCommandPrintsSummary() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString('help\r');
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(output.indexOf('r [reg=value]  registers') !== -1, true, 'help command did not list register syntax');
    assert.equal(output.indexOf('a <addr>       assemble') !== -1, true, 'help command did not list assembler syntax');
    assert.equal(output.indexOf('save <addr> <len> <name>') !== -1, true, 'help command did not list save syntax');
    assert.equal(output.indexOf('loadasm <addr> <name>') !== -1, true, 'help command did not list loadasm syntax');
    assert.equal(output.indexOf('source          list source/ files') !== -1, true, 'help command did not list source syntax');
    assert.equal(output.indexOf('list            list save/ files') !== -1, true, 'help command did not list list syntax');
    assert.equal(output.indexOf('reset          reboot monitor') !== -1, true, 'help command did not list reset syntax');
    assert.equal(/j68> $/.test(output), true, 'help command did not return to the prompt');
})();

(function testListCommandShowsSaveFiles() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString('list\r');
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(output.indexOf('hello_uart.bin') !== -1, true, 'list command did not show hello_uart.bin');
    assert.equal(output.indexOf('pi16_nilakantha.bin') !== -1, true, 'list command did not show pi16_nilakantha.bin');
    assert.equal(output.indexOf('.gitkeep') === -1, true, 'list command showed dotfiles');
    assert.equal(/j68> $/.test(output), true, 'list command did not return to the prompt');
})();

(function testSourceCommandShowsSourceFilesAndHidesDotfiles() {
    var state = bootMonitorMachine();
    state.uart.consumeTxString();
    state.uart.enqueueRxString('source\r');
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(output.indexOf('count10.asm') !== -1, true, 'source command did not show count10.asm');
    assert.equal(output.indexOf('.gitkeep') === -1, true, 'source command showed dotfiles');
    assert.equal(/j68> $/.test(output), true, 'source command did not return to the prompt');
})();

console.log('monitor_errors.test.js: ok');
