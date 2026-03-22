#!/usr/bin/env node

var assert = require('assert');
var path = require('path');
var TestMachine = require('../../src/machine/test_machine');
var Uart = require('../../src/machine/devices/uart');
var memoryMap = require('../../src/machine/memory_map');
var assemble = require('./support/assemble_m68k');

(function testBootRomPrintsBannerToUartAndFallsIntoIdleLoop() {
    var rom = assemble.assembleToBinary(path.join(__dirname, '../../rom/boot_banner.S'));
    assert.equal(rom.length >= 0x18, true, 'assembled boot ROM is unexpectedly short');

    var machine = new TestMachine({
        rom: rom,
        chipRamSize: 0x00200000,
        fastRamSize: 0x00400000,
        overlay: true,
        cpuType: '68000'
    });
    var uart = new Uart();
    machine.mapDevice(uart.region());

    machine.reset();
    machine.runBlocks(2);

    assert.equal(machine.cpu.context.pc >>> 0, memoryMap.ROM_START + 0x16, 'boot ROM did not settle at the idle loop');
    assert.equal(uart.txString(), 'j68\n', 'boot ROM did not write the expected banner to UART');
})();

console.log('uart_boot.test.js: ok');
