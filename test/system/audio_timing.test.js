#!/usr/bin/env node

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var Timer = require('../../src/machine/devices/timer');
var bootMachine = require('./support/boot_machine').bootMachine;

(function testAxelfSequencerAdvancesOnTimerEvents() {
    var state = bootMachine({
        monitor: false,
        uart: false,
        sound: true,
        timer: true,
        rtc: true,
        bootBlocks: 0,
        soundOptions: {
            backend: 'null',
            sampleRate: 8000
        },
        timerOptions: {
            defaultReload: 1,
            baseHz: 32768
        }
    });
    var machine = state.machine;
    var sound = state.sound;
    var timer = state.timer;
    var cpu = machine.cpu.context;
    var bin = fs.readFileSync(path.join(__dirname, '../../save/axelf.bin'));
    var firstPointer;
    var firstTicks;
    var i;

    machine.realTimeDevices = true;
    machine.loadChipRamBytes(0x00090000, bin);
    cpu.pc = 0x00090000;
    cpu.a[7] = 0x001fffc0;
    cpu.setSr(0x2700);

    assert.equal(machine.runUntilInstruction(function () {
        return timer.control !== 0 && sound.globalCtrl !== 0;
    }, 2000), true, 'axelf did not initialize timer/audio');

    assert.equal(machine.runUntilInstruction(function () {
        return sound.channels[0].freq !== 0;
    }, 2000), true, 'axelf did not program the first note frequency');

    firstPointer = cpu.a[2] >>> 0;
    firstTicks = timer.ticks >>> 0;

    timer.control = 0;
    timer.pending = false;
    for (i = 0; i < 1000; ++i)
        machine.stepInstruction();

    assert.equal(cpu.a[2] >>> 0, firstPointer, 'sequencer advanced while timer was disabled');
    assert.equal(timer.ticks >>> 0, firstTicks, 'timer ticked while disabled');

    timer.control = Timer.CONTROL_ENABLE | Timer.CONTROL_AUTORELOAD;
    timer.count = 1;
    timer.reload = 1;

    assert.equal(machine.runUntilInstruction(function () {
        machine.advanceRealTime(0.005);
        return (timer.ticks >>> 0) > firstTicks;
    }, 2000), true, 'timer did not produce the next sequencer event');
    assert.equal(machine.runUntilInstruction(function () {
        machine.advanceRealTime(0.005);
        return (cpu.a[2] >>> 0) > firstPointer;
    }, 2000), true, 'sequencer did not advance after the timer event');
    assert.equal(sound.generatedSamples > 0, true, 'sound device did not continue generating samples');
})();

console.log('audio_timing.test.js: ok');
