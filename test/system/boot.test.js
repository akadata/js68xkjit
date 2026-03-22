#!/usr/bin/env node

var assert = require('assert');
var j68 = require('../../src/j68');
var TestMachine = require('../../src/machine/test_machine');
var memoryMap = require('../../src/machine/memory_map');

var cpuType = process.env.J68_CPU_TYPE || '68000';

function write32be(bytes, offset, value) {
    bytes[offset + 0] = (value >>> 24) & 0xff;
    bytes[offset + 1] = (value >>> 16) & 0xff;
    bytes[offset + 2] = (value >>> 8) & 0xff;
    bytes[offset + 3] = value & 0xff;
}

function expectedCpuType(name) {
    switch (String(name).toLowerCase()) {
        case '68000':
        case 'mc68000':
            return j68.j68.TYPE_MC68000;
        case '68020':
        case 'mc68020':
            return j68.j68.TYPE_MC68020;
        case '68030':
        case 'mc68030':
            return j68.j68.TYPE_MC68030;
        case '68040':
        case 'mc68040':
            return j68.j68.TYPE_MC68040;
    }
    throw new Error('unexpected cpuType in test: ' + name);
}

(function testResetReadsVectorsThroughKickstartOverlay() {
    var rom = new Uint8Array(memoryMap.ROM_SIZE);
    write32be(rom, 0x0000, 0x0007fff0);
    write32be(rom, 0x0004, 0x00f80040);
    rom[0x40] = 0x4e;
    rom[0x41] = 0x71;

    var machine = new TestMachine({ rom: rom, chipRamSize: 0x00100000, fastRamSize: 0x00400000, cpuType: cpuType });
    machine.reset();

    assert.equal(machine.cpu.context.pc >>> 0, 0x00f80040, 'reset did not load initial PC from the Kickstart overlay');
    assert.equal(machine.cpu.context.a[7] >>> 0, 0x0007fff0, 'reset did not load initial SSP from the Kickstart overlay');
    assert.equal(machine.cpu.context.ssp >>> 0, 0x0007fff0, 'reset did not synchronize SSP');
    assert.equal(machine.cpu.context.sr & 0xffff, 0x2700, 'reset did not enter supervisor state with interrupt mask 7');
    assert.equal(machine.cpu.context.fetch(0x00000040), 0x4e71, 'overlay fetch did not expose ROM at address 0');
    assert.equal(machine.cpu.context.fetch(0x00f80040), 0x4e71, 'ROM fetch at the physical Kickstart window failed');
})();

(function testCpuTypeIsConfigurable() {
    var machine = new TestMachine({ cpuType: cpuType });
    assert.equal(machine.cpu.type, expectedCpuType(cpuType), 'machine did not accept a configured CPU type');
})();

console.log('boot.test.js: ok');
