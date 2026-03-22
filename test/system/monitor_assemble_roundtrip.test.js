#!/usr/bin/env node

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var TestMachine = require('../../src/machine/test_machine');
var Uart = require('../../src/machine/devices/uart');
var assemble = require('./support/assemble_m68k');

var saveDir = path.resolve(__dirname, '../../save');
var saveFile = path.join(saveDir, 'roundtrip.bin');

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

(function testAssembleDisassembleRunSaveLoadResetRoundTrip() {
    var state = bootMonitorMachine();
    fs.rmSync(saveFile, { force: true });
    state.uart.consumeTxString();
    state.uart.enqueueRxString(
        'a 00090000\r' +
        'moveq #1,d0\r' +
        'addq.w #1,d0\r' +
        'monitor\r' +
        '\r' +
        'u 00090000\r' +
        'g 00090000\r' +
        'r\r' +
        'save 00090000 06 roundtrip.bin\r' +
        'm 00090000=00 00 00 00 00 00\r' +
        'load 00090000 roundtrip.bin\r' +
        '\r'
    );
    state.machine.pollMonitor();

    var output = state.uart.txString();
    assert.equal(output.indexOf('00090000  ') !== -1, true, 'assembler did not enter line mode');
    assert.equal(output.indexOf('ASSEMBLY DONE') !== -1, true, 'assembler did not report exit cleanly');
    assert.equal(output.indexOf('00090000: MOVEQ #1,D0') !== -1, true, 'disassembly did not show MOVEQ');
    assert.equal(output.indexOf('00090002: ADDQ.W #1,D0') !== -1, true, 'disassembly did not show ADDQ.W');
    assert.equal(output.indexOf('00090004: MONITOR') !== -1, true, 'disassembly did not show MONITOR');
    assert.equal(output.indexOf('D0=00000002') !== -1, true, 'program did not leave D0 at 2');
    assert.equal(output.indexOf('SAVED 6 roundtrip.bin') !== -1, true, 'save did not report success');
    assert.equal(output.indexOf('LOADED 6 roundtrip.bin') !== -1, true, 'load did not report success');
    assert.deepEqual(Array.from(fs.readFileSync(saveFile)), [0x70, 0x01, 0x52, 0x40, 0xa0, 0x00], 'saved program bytes were wrong');

    state.uart.consumeTxString();
    state.uart.enqueueRxString('reset\r');
    state.machine.pollMonitor();
    assert.equal(state.uart.txString().indexOf('j68\nj68> ') !== -1, true, 'reset did not reenter the monitor');
    fs.rmSync(saveFile, { force: true });
})();

console.log('monitor_assemble_roundtrip.test.js: ok');
