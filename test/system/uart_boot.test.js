#!/usr/bin/env node

var assert = require('assert');
var path = require('path');
var memoryMap = require('../../src/machine/memory_map');
var assemble = require('./support/assemble_m68k');
var bootMachine = require('./support/boot_machine').bootMachine;

var cpuType = process.env.J68_CPU_TYPE || '68000';

(function testBootRomPrintsBannerToUartAndFallsIntoIdleLoop() {
    var rom = assemble.assembleToBinary(path.join(__dirname, '../../rom/boot_banner.S'), cpuType);
    assert.equal(rom.length >= 0x18, true, 'assembled boot ROM is unexpectedly short');

    var state = bootMachine({
        rom: rom,
        monitor: false,
        uart: true,
        bootBlocks: 2,
        cpuType: cpuType
    });

    assert.equal(state.machine.cpu.context.pc >>> 0, memoryMap.ROM_START + 0x16, 'boot ROM did not settle at the idle loop');
    assert.equal(state.uart.txString(), 'j68\n', 'boot ROM did not write the expected banner to UART');
})();

console.log('uart_boot.test.js: ok');