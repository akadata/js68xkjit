#!/usr/bin/env node

var assert = require('assert');
var TestMachine = require('../../src/machine/test_machine');
var memoryMap = require('../../src/machine/memory_map');
var cpuType = process.env.J68_CPU_TYPE || '68000';

(function testChipRamReadsAndWritesUseBigEndianBusSemantics() {
    var machine = new TestMachine({ fastRamSize: 0, overlay: false, cpuType: cpuType });
    var base = memoryMap.CHIP_RAM_START;

    machine.cpu.context.s8(base, 0x12);
    machine.cpu.context.s8(base + 1, 0x34);
    machine.cpu.context.s8(base + 2, 0x56);
    machine.cpu.context.s8(base + 3, 0x78);

    assert.equal(machine.cpu.context.l8(base), 0x12, 'chip RAM byte read mismatch');
    assert.equal(machine.cpu.context.l16(base), 0x1234, 'chip RAM word read mismatch');
    assert.equal(machine.cpu.context.l32(base), 0x12345678, 'chip RAM long read mismatch');
})();

(function testFastRamLivesInAmigaExpansionSpace() {
    var machine = new TestMachine({ chipRamSize: 0x00080000, fastRamSize: 0x00400000, cpuType: cpuType });
    var base = memoryMap.FAST_RAM_START;

    machine.cpu.context.s16(base, 0xabcd);
    machine.cpu.context.s32(base + 2, 0x89abcdef);

    assert.equal(machine.cpu.context.l16(base), 0xabcd, 'fast RAM word access mismatch');
    assert.equal(machine.cpu.context.l32(base + 2), 0x89abcdef, 'fast RAM long access mismatch');
})();

(function testOverlayHidesChipRamUntilDisabled() {
    var rom = new Uint8Array(memoryMap.ROM_SIZE);
    rom[0] = 0xaa;

    var machine = new TestMachine({ rom: rom, fastRamSize: 0, cpuType: cpuType });
    machine.loadChipRamBytes(0, Uint8Array.from([ 0x55 ]));

    assert.equal(machine.cpu.context.l8(0), 0xaa, 'overlay did not expose ROM at address 0');
    machine.setOverlay(false);
    assert.equal(machine.cpu.context.l8(0), 0x55, 'chip RAM did not become visible after disabling the overlay');
})();

(function testRomIsReadOnlyAtPhysicalKickstartWindow() {
    var machine = new TestMachine({ cpuType: cpuType });
    assert.throws(function () {
        machine.cpu.context.s8(memoryMap.ROM_START, 0xff);
    }, /read-only/, 'ROM write did not fail');
})();

(function testMachineIoWindowIsReservedUntilDevicesAreAttached() {
    var machine = new TestMachine({ cpuType: cpuType });
    assert.throws(function () {
        machine.cpu.context.l8(memoryMap.UART_START);
    }, /unmapped bus access/, 'unmapped MMIO read did not fail');
})();

console.log('memory_map.test.js: ok');
