#!/usr/bin/env node

var assert = require('assert');
var path = require('path');
var TestMachine = require('../../src/machine/test_machine');
var Intc = require('../../src/machine/devices/intc');
var Timer = require('../../src/machine/devices/timer');
var assemble = require('./support/assemble_m68k');

(function testTimerRaisesIrq2AndRteReturnsCleanly() {
    var machine = new TestMachine({
        rom: assemble.assembleToBinary(path.join(__dirname, '../../rom/timer_irq.S')),
        chipRamSize: 0x00200000,
        fastRamSize: 0x00400000,
        overlay: true,
        cpuType: '68000'
    });
    var intc = new Intc();
    var timer = new Timer({ irqLevel: 2, defaultReload: 1000 });
    var tickAddress = 0x00090000;
    machine.attachIntc(intc);
    machine.attachTimer(timer);
    machine.reset();

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
