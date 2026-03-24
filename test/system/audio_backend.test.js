#!/usr/bin/env node

var assert = require('assert');
var events = require('events');
var childProcess = require('child_process');

var originalSpawn = childProcess.spawn;

function fakeChild() {
    var child = new events.EventEmitter();
    child.stdin = new events.EventEmitter();
    child.stdin.destroyed = false;
    child.stdin.write = function () {
        process.nextTick(function () {
            child.stdin.emit('error', Object.assign(new Error('EPIPE'), { code: 'EPIPE' }));
        });
        return false;
    };
    child.stdin.end = function () {
        child.stdin.destroyed = true;
        child.stdin.emit('close');
    };
    child.kill = function () {
        child.emit('exit', 0);
    };
    return child;
}

childProcess.spawn = function () {
    return fakeChild();
};

var Sound = require('../../src/machine/devices/sound');

(function testBrokenAudioPipeDisablesBackendWithoutThrowing() {
    var errors = [];
    var originalError = console.error;
    console.error = function (message) {
        errors.push(String(message));
    };
    try {
        var sound = new Sound({ backend: 'ffplay', sampleRate: 8000, baseHz: 1000000 });
        sound.globalCtrl = 1;
        sound.channels[0].ctrl = 0x0303;
        sound.channels[0].vol = 0xff;
        sound.channels[0].ad = 0x11;
        sound.channels[0].sr = 0x81;
        sound.channels[0].freq = 0x20000000;
        sound.channels[0].envState = 'attack';
        sound.advance(50000);
        setImmediate(function () {
            assert.equal(errors.some(function (line) { 
                return /audio backend ffplay pipe closed/.test(line); 
            }), true, 'broken ffplay pipe did not degrade cleanly');
            sound.advance(50000);
            console.error = originalError;
            childProcess.spawn = originalSpawn;
            console.log('audio_backend.test.js: ok');
        });
    } catch (error) {
        console.error = originalError;
        childProcess.spawn = originalSpawn;
        throw error;
    }
})();
