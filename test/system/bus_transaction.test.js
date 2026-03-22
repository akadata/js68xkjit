#!/usr/bin/env node

var assert = require('assert');
var Bus = require('../../src/machine/bus');
var TestMachine = require('../../src/machine/test_machine');
var Intc = require('../../src/machine/devices/intc');
var memoryMap = require('../../src/machine/memory_map');
var cpuType = process.env.J68_CPU_TYPE || '68000';

(function testTransactionCarriesFunctionCodeAndKind() {
    var machine = new TestMachine({ overlay: false, cpuType: cpuType });

    machine.cpu.context.setSr(0x2000);
    machine.cpu.context.fetch(memoryMap.ROM_START);
    assert.equal(machine.bus.lastTransaction.fc, Bus.FC_SUPERVISOR_PROGRAM, 'fetch did not carry supervisor program FC');
    assert.equal(machine.bus.lastTransaction.kind, 'fetch', 'fetch did not carry fetch kind');
    assert.equal(machine.bus.lastTransaction.write, false, 'fetch transaction was marked as write');

    machine.cpu.context.setSr(0x0000);
    machine.cpu.context.l8(memoryMap.CHIP_RAM_START);
    assert.equal(machine.bus.lastTransaction.fc, Bus.FC_USER_DATA, 'data read did not carry user data FC');
    assert.equal(machine.bus.lastTransaction.kind, 'read', 'data read did not carry read kind');
})();

(function testUnmappedAccessProducesBusErrorTransaction() {
    var machine = new TestMachine({ cpuType: cpuType });
    var tx = machine.bus.transact(machine.bus.createTransaction(memoryMap.UART_START, 1, false, {
        fc: Bus.FC_SUPERVISOR_DATA,
        kind: 'read'
    }));

    assert.equal(tx.berr, true, 'unmapped access did not set berr');
    assert.equal(/unmapped bus access/.test(tx.error.message), true, 'unmapped access did not retain bus error information');
})();

(function testIllegalMmioWidthProducesBusErrorTransaction() {
    var bus = new Bus();
    var mmio = {
        name: 'strict-mmio',
        start: 0x00de1000,
        end: 0x00de1003,
        strictSizes: true,
        read32: function () { return 0x12345678; },
        write32: function () {}
    };

    bus.map(mmio);
    var tx = bus.transact(bus.createTransaction(0x00de1000, 1, false, {
        fc: Bus.FC_SUPERVISOR_DATA,
        kind: 'read'
    }));

    assert.equal(tx.berr, true, 'illegal MMIO width did not set berr');
    assert.equal(/rejects 8-bit read/.test(tx.error.message), true, 'illegal MMIO width did not retain device-side bus error information');
})();

(function testHighestActiveIplWins() {
    var machine = new TestMachine({ cpuType: cpuType });
    var intc = new Intc();

    machine.attachIntc(intc);
    intc.raise(2);
    intc.raise(5);
    intc.raise(4);

    assert.equal(machine.getInterruptLevel(), 5, 'machine did not resolve highest active IPL');
    assert.equal(machine.bus.resolveIpl(), 5, 'bus did not resolve highest active IPL');
})();

console.log('bus_transaction.test.js: ok');
