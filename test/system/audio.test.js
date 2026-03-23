#!/usr/bin/env node

var assert = require('assert');
var memoryMap = require('../../src/machine/memory_map');
var registers = require('../../src/machine/registers/audio');
var bootMachine = require('./support/boot_machine').bootMachine;

(function testTwoChannelPulseAndSawFlow() {
    var state = bootMachine({
        monitor: false,
        uart: false,
        sound: true,
        bootBlocks: 0,
        soundOptions: {
            backend: 'null',
            sampleRate: 8000,
            baseHz: 1000000
        }
    });
    var machine = state.machine;
    var sound = state.sound;
    var base = memoryMap.AUDIO_START;
    var pulseCtrl = registers.CH_CTRL_BITS.ENABLE |
        registers.CH_CTRL_BITS.GATE |
        (registers.CH_WAVE_TYPES.PULSE << registers.CH_WAVE_SHIFT);
    var sawCtrl = registers.CH_CTRL_BITS.ENABLE |
        registers.CH_CTRL_BITS.GATE |
        (registers.CH_WAVE_TYPES.SAW << registers.CH_WAVE_SHIFT);
    var pulseGateOff = registers.CH_CTRL_BITS.ENABLE |
        (registers.CH_WAVE_TYPES.PULSE << registers.CH_WAVE_SHIFT);
    var sawGateOff = registers.CH_CTRL_BITS.ENABLE |
        (registers.CH_WAVE_TYPES.SAW << registers.CH_WAVE_SHIFT);

    machine.write16(base + registers.CH_INDEX, 0);
    machine.write16(base + registers.MASTER_VOL, 0x00ff);
    machine.write16(base + registers.CH_FREQ_HI, 0x2000);
    machine.write16(base + registers.CH_FREQ_LO, 0x0000);
    machine.write16(base + registers.CH_AD, 0x11);
    machine.write16(base + registers.CH_SR, 0x81);
    machine.write16(base + registers.CH_VOL, 0x00c0);
    machine.write16(base + registers.GLOBAL_CTRL, registers.GLOBAL_CTRL_BITS.ENABLE);
    machine.write16(base + registers.CH_CTRL, pulseCtrl);

    machine.write16(base + registers.CH_INDEX, 1);
    machine.write16(base + registers.CH_FREQ_HI, 0x1000);
    machine.write16(base + registers.CH_FREQ_LO, 0x0000);
    machine.write16(base + registers.CH_AD, 0x22);
    machine.write16(base + registers.CH_SR, 0x72);
    machine.write16(base + registers.CH_VOL, 0x0080);
    machine.write16(base + registers.CH_CTRL, sawCtrl);

    machine.advanceDevices(50000);

    assert.equal(sound.generatedSamples > 0, true, 'sound device did not generate samples');
    assert.equal(machine.read16(base + registers.CHANNEL_COUNT), 2, 'sound device did not report two channels');
    assert.equal(machine.read16(base + registers.GLOBAL_STATUS) & registers.GLOBAL_STATUS_BITS.ENABLED, registers.GLOBAL_STATUS_BITS.ENABLED, 'global enabled bit was not reflected in status');
    machine.write16(base + registers.CH_INDEX, 0);
    assert.equal(machine.read16(base + registers.CH_STATE) & registers.CH_STATE_BITS.ACTIVE, registers.CH_STATE_BITS.ACTIVE, 'channel did not become active after gate on');
    assert.equal(machine.read16(base + registers.CH_ENV_LEVEL) > 0, true, 'envelope level did not rise above zero');
    assert.equal(machine.read16(base + registers.CH_FREQ_HI), 0x2000, 'channel frequency high word did not read back');
    assert.equal(machine.read16(base + registers.CH_VOL), 0x00c0, 'channel volume did not read back');
    machine.write16(base + registers.CH_INDEX, 1);
    assert.equal(machine.read16(base + registers.CH_STATE) & registers.CH_STATE_BITS.ACTIVE, registers.CH_STATE_BITS.ACTIVE, 'second channel did not become active after gate on');
    assert.equal(machine.read16(base + registers.CH_FREQ_HI), 0x1000, 'second channel frequency high word did not read back');
    assert.equal(machine.read16(base + registers.CH_VOL), 0x0080, 'second channel volume did not read back');

    machine.write16(base + registers.CH_CTRL, sawGateOff);
    machine.write16(base + registers.CH_INDEX, 0);
    machine.write16(base + registers.CH_CTRL, pulseGateOff);
    machine.advanceDevices(300000);

    assert.equal(machine.read16(base + registers.CH_STATE) & registers.CH_STATE_BITS.ACTIVE, 0, 'channel remained active after release');
    assert.equal(machine.read16(base + registers.CH_ENV_LEVEL), 0, 'envelope level did not decay to zero after release');
    machine.write16(base + registers.CH_INDEX, 1);
    assert.equal(machine.read16(base + registers.CH_STATE) & registers.CH_STATE_BITS.ACTIVE, 0, 'second channel remained active after release');
    assert.equal(machine.read16(base + registers.CH_ENV_LEVEL), 0, 'second channel envelope level did not decay to zero after release');
})();

(function testNoiseWaveformProducesChangingSamples() {
    var state = bootMachine({
        monitor: false,
        uart: false,
        sound: true,
        bootBlocks: 0,
        soundOptions: {
            backend: 'null',
            sampleRate: 8000,
            baseHz: 32768
        }
    });
    var machine = state.machine;
    var sound = state.sound;
    var base = memoryMap.AUDIO_START;
    var noiseCtrl = registers.CH_CTRL_BITS.ENABLE |
        registers.CH_CTRL_BITS.GATE |
        (registers.CH_WAVE_TYPES.NOISE << registers.CH_WAVE_SHIFT);
    var samples = [];
    var i;

    machine.write16(base + registers.CH_INDEX, 0);
    machine.write16(base + registers.MASTER_VOL, 0x00ff);
    machine.write16(base + registers.CH_FREQ_HI, 0x6000);
    machine.write16(base + registers.CH_FREQ_LO, 0x0000);
    machine.write16(base + registers.CH_AD, 0x11);
    machine.write16(base + registers.CH_SR, 0xf1);
    machine.write16(base + registers.CH_VOL, 0x00c0);
    machine.write16(base + registers.GLOBAL_CTRL, registers.GLOBAL_CTRL_BITS.ENABLE);
    machine.write16(base + registers.CH_CTRL, noiseCtrl);

    for (i = 0; i < 32; ++i)
        samples.push(sound.generateSample());

    assert.equal(samples.some(function (value) { return value > 0; }), true, 'noise waveform never produced a positive sample');
    assert.equal(samples.some(function (value) { return value < 0; }), true, 'noise waveform never produced a negative sample');
})();

console.log('audio.test.js: ok');
