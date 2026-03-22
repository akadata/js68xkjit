#!/usr/bin/env node

var assert = require('assert');
var path = require('path');
var assemble = require('./support/assemble_m68k');

var cpuType = process.env.J68_CPU_TYPE || '68000';
var bootMachine = require('./support/boot_machine').bootMachine;

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

console.log('irq.test.js: ok');
