#!/usr/bin/env node

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var TestMachine = require('../../src/machine/test_machine');
var Uart = require('../../src/machine/devices/uart');
var assemble = require('./support/assemble_m68k');

var saveDir = path.resolve(__dirname, '../../save');
var saveFile = path.join(saveDir, 'monitor_test.bin');
var patchAddress = 0x00090020;

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

(function testRegisterSetMemoryPatchSaveAndLoad() {
    var state = bootMonitorMachine();
    fs.rmSync(saveFile, { force: true });
    state.uart.consumeTxString();

    state.uart.enqueueRxString('r d0=1234\r');
    state.machine.pollMonitor();
    assert.equal(state.uart.txString().indexOf('D0=00001234') !== -1, true, 'register set did not update D0');

    state.uart.consumeTxString();
    state.uart.enqueueRxString('m 00090020=4E 71 A0 00\r');
    state.machine.pollMonitor();
    assert.equal(state.uart.txString().indexOf('00090020: 4E 71 A0 00') !== -1, true, 'memory patch did not write bytes');

    state.uart.consumeTxString();
    state.uart.enqueueRxString('save 00090020 4 monitor_test.bin\r');
    state.machine.pollMonitor();
    assert.equal(state.uart.txString().indexOf('SAVED 4 monitor_test.bin') !== -1, true, 'save command did not report success');
    assert.deepEqual(Array.from(fs.readFileSync(saveFile)), [0x4e, 0x71, 0xa0, 0x00], 'save command wrote the wrong bytes');

    state.uart.consumeTxString();
    state.uart.enqueueRxString('m 00090020=00 00 00 00\r');
    state.machine.pollMonitor();

    state.uart.consumeTxString();
    state.uart.enqueueRxString('load 00090020 monitor_test.bin\r');
    state.machine.pollMonitor();
    assert.equal(state.uart.txString().indexOf('LOADED 4 monitor_test.bin') !== -1, true, 'load command did not report success');
    assert.equal(state.machine.read16(patchAddress), 0x4e71, 'load command did not restore first word');
    assert.equal(state.machine.read16(patchAddress + 2), 0xa000, 'load command did not restore second word');

    fs.rmSync(saveFile, { force: true });
})();

console.log('monitor_patch_loadsave.test.js: ok');
