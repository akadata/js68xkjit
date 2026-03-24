#!/usr/bin/env node

var assert = require('assert');
var memoryMap = require('../../src/machine/memory_map');
var bootMachine = require('./support/boot_machine').bootMachine;

(function testRtcReportsCrystalAndCalendarTime() {
    var fixed = new Date('2026-03-23T21:34:56.500Z');
    var state = bootMachine({
        monitor: false,
        uart: false,
        rtc: true,
        bootBlocks: 0,
        rtcOptions: {
            utc: true,
            mode: 'PAL',
            frameHz: 50,
            crystalHz: 32768,
            nowProvider: function () {
                return new Date(fixed.getTime());
            }
        }
    });
    var machine = state.machine;
    var base = memoryMap.RTC_START >>> 0;

    assert.equal(machine.read16(base + 0x00), 0x5243, 'RTC ID mismatch');
    assert.equal(machine.read16(base + 0x02), 0x0001, 'RTC control mismatch');
    assert.equal(machine.read16(base + 0x04), 0x0001, 'RTC status mismatch');
    assert.equal(machine.read16(base + 0x06), 50, 'RTC frame Hz mismatch');
    assert.equal(machine.read16(base + 0x08), 32768, 'RTC crystal Hz mismatch');
    assert.equal(machine.read16(base + 0x0a), 2026, 'RTC year mismatch');
    assert.equal(machine.read16(base + 0x0c), 0x0317, 'RTC month/day mismatch');
    assert.equal(machine.read16(base + 0x0e), 0x1522, 'RTC hour/minute mismatch');
    assert.equal(machine.read16(base + 0x10), 0x3801, 'RTC second/weekday mismatch');
    assert.equal(machine.read16(base + 0x12), 16384, 'RTC subseconds mismatch');
})();

(function testRtcUtcControlBitIsWritable() {
    var state = bootMachine({
        monitor: false,
        uart: false,
        rtc: true,
        bootBlocks: 0
    });
    var machine = state.machine;
    var base = memoryMap.RTC_START >>> 0;

    machine.write8(base + 0x03, 0x01);
    assert.equal(machine.read16(base + 0x02), 0x0001, 'RTC UTC bit did not set');
    machine.write8(base + 0x03, 0x00);
    assert.equal(machine.read16(base + 0x02), 0x0000, 'RTC UTC bit did not clear');
})();

console.log('rtc.test.js: ok');