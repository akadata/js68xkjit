#!/usr/bin/env node

var assert = require('assert');
var TestMachine = require('../../src/machine/test_machine');
var Video = require('../../src/machine/devices/video');
var memoryMap = require('../../src/machine/memory_map');

var cpuType = process.env.J68_CPU_TYPE || '68000';

(function testVideoDeviceAttachesThroughBusWithoutMachineSpecificGlue() {
    var machine = new TestMachine({ cpuType: cpuType });
    var video = new Video({ columns: 8, rows: 2 });

    machine.mapDevice(video);
    machine.write8(memoryMap.VIDEO_START + 0x40, 'H'.charCodeAt(0));
    machine.write8(memoryMap.VIDEO_START + 0x41, 'I'.charCodeAt(0));

    assert.equal(machine.read8(memoryMap.VIDEO_START + 0x40), 'H'.charCodeAt(0), 'video device was not readable through the bus');
    assert.equal(machine.read8(memoryMap.VIDEO_START + 0x41), 'I'.charCodeAt(0), 'video device second cell was not readable through the bus');
    assert.equal(video.text().slice(0, 2), 'HI', 'video device text buffer did not reflect MMIO writes');
})();

console.log('bus_device.test.js: ok');
