#!/usr/bin/env node

var assert = require('assert');
var path = require('path');
var assemble = require('./support/assemble_m68k');
var TestMachine = require('../../src/machine/test_machine');
var Intc = require('../../src/machine/devices/intc');

var cpuType = process.env.J68_CPU_TYPE || '68000';
var bootMachine = require('./support/boot_machine').bootMachine;

function write32be(bytes, offset, value) {
    bytes[offset + 0] = (value >>> 24) & 0xff;
    bytes[offset + 1] = (value >>> 16) & 0xff;
    bytes[offset + 2] = (value >>> 8) & 0xff;
    bytes[offset + 3] = value & 0xff;
}

function bareInterruptMachine(typeName) {
    var rom = new Uint8Array(0x80000);
    write32be(rom, 0x0000, 0x001fffc0);
    write32be(rom, 0x0004, 0x00f80040);
    write32be(rom, (24 + 3) << 2, 0x00f80100);
    write32be(rom, (24 + 5) << 2, 0x00f80120);
    rom[0x40] = 0x4e; rom[0x41] = 0x71;
    var machine = new TestMachine({
        rom: rom,
        chipRamSize: 0x00200000,
        fastRamSize: 0x00400000,
        overlay: true,
        cpuType: typeName || cpuType
    });
    var intc = new Intc();
    machine.attachIntc(intc);
    machine.reset();
    return { 
        machine: machine, intc: intc 
    };
}

(function testTimerRaisesIrq2AndRteReturnsCleanly() {
    var state = bootMachine({
        rom: assemble.assembleToBinary(path.join(__dirname, '../../rom/timer_irq.S'), cpuType),
        uart: false,
        monitor: false,
        intc: true,
        timer: true,
        timerOptions: { irqLevel: 2, defaultReload: 1000 },
        bootBlocks: 0,
        cpuType: cpuType
    });
    var machine = state.machine;
    var intc = state.intc;
    var timer = state.timer;
    var tickAddress = 0x00090000;

    var reached = machine.runUntil(function (m) {
        return m.cpu.context.l32(tickAddress) >= 2;
    }, 200);

    assert.equal(reached, true, 'timer IRQ did not increment the RAM tick counter');
    assert.equal(machine.cpu.context.l32(tickAddress) >= 2, true, 'ISR did not update the tick counter');
    assert.equal(machine.cpu.context.a[7] >>> 0, 0x001fffc0, 'RTE did not restore the stack pointer');
    assert.equal((machine.cpu.context.sr & 0xffff), 0x2000, 'RTE did not restore SR after the interrupt');
    assert.equal(timer.pending, false, 'timer pending flag was not cleared on acknowledge');
    assert.equal(intc.pending, 0, 'interrupt controller still has a pending IRQ after acknowledge');
})();

(function testMaskedAndEqualPriorityInterruptsDoNotPreempt() {
    var state = bareInterruptMachine('68000');
    var machine = state.machine;
    var intc = state.intc;

    machine.cpu.context.pc = 0x00001234;
    machine.cpu.context.setSr(0x2300);
    intc.raise(3);

    assert.equal(machine.pollInterrupts(), 0, 'equal-priority interrupt should not preempt');
    assert.equal(machine.cpu.context.pc >>> 0, 0x00001234, 'PC changed for equal-priority interrupt');
    assert.equal(intc.pending !== 0, true, 'pending IRQ was cleared despite being masked');

    machine.cpu.context.setSr(0x2500);
    intc.raise(5);

    assert.equal(machine.pollInterrupts(), 0, 'masked higher-level SR should block equal-priority interrupt');
    assert.equal(machine.cpu.context.pc >>> 0, 0x00001234, 'PC changed for masked interrupt');

    machine.cpu.context.setSr(0x2200);
    assert.equal(machine.pollInterrupts(), 5, 'higher pending interrupt was not accepted after lowering SR mask');
    assert.equal(machine.cpu.context.pc >>> 0, 0x00f80120, 'accepted interrupt did not vector to the expected autovector');
    assert.equal((machine.cpu.context.sr & 0x2700), 0x2500, 'accepted interrupt did not raise SR IPL to the accepted level');
    assert.equal((intc.pending & (1 << 5)) === 0, true, 'accepted interrupt level was not acknowledged');
    assert.equal((intc.pending & (1 << 3)) !== 0, true, 'lower pending interrupt should remain pending');
})();


(function testIntcMaskSuppressesInterruptDelivery() {
    var state = bareInterruptMachine('68000');
    var machine = state.machine;
    var intc = state.intc;

    machine.cpu.context.pc = 0x00005678;
    machine.cpu.context.setSr(0x2000);
    intc.mask = 0;
    intc.raise(4);

    assert.equal(machine.getInterruptLevel(), 0, 'controller mask did not suppress resolved IPL');
    assert.equal(machine.pollInterrupts(), 0, 'masked controller interrupt should not be accepted');
    assert.equal(machine.cpu.context.pc >>> 0, 0x00005678, 'PC changed for controller-masked interrupt');
    assert.equal((intc.pending & (1 << 4)) !== 0, true, 'controller-masked interrupt should remain pending');
})();

(function testInterruptUsesRelocatedVbrOn68020Plus() {
    var state = bareInterruptMachine('68020');
    var machine = state.machine;
    var intc = state.intc;
    var vectorBase = 0x00010000;
    var handlerPc = 0x00012000;

    machine.setOverlay(false);
    machine.cpu.context.vbr = vectorBase >>> 0;
    machine.write32(vectorBase + ((24 + 5) << 2), handlerPc);
    machine.cpu.context.pc = 0x00001234;
    machine.cpu.context.setSr(0x2000);
    intc.raise(5);

    assert.equal(machine.pollInterrupts(), 5, 'interrupt was not accepted at IPL 5');
    assert.equal(machine.cpu.context.pc >>> 0, handlerPc >>> 0, 'interrupt did not use VBR-relocated vector table');
})();

console.log('irq.test.js: ok');