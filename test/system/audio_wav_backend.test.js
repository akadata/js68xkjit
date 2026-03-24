#!/usr/bin/env node

var assert = require('assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
var Sound = require('../../src/machine/devices/sound');

(function testWavBackendWritesValidHeaderAndData() {
    var wavPath = path.join(os.tmpdir(), 'j68-audio-test-' + process.pid + '.wav');
    try {
        var sound = new Sound({
            backend: 'wav',
            wavPath: wavPath,
            sampleRate: 8000,
            baseHz: 1000000
        });

        sound.globalCtrl = 1;
        sound.channels[0].ctrl = 0x0303;
        sound.channels[0].vol = 0xff;
        sound.channels[0].ad = 0x11;
        sound.channels[0].sr = 0x81;
        sound.channels[0].freq = 0x20000000;
        sound.channels[0].envState = 'attack';
        sound.advance(50000);
        sound.ensureBackend().close();

        var wav = fs.readFileSync(wavPath);
        assert.equal(wav.toString('ascii', 0, 4), 'RIFF', 'wav file did not start with RIFF');
        assert.equal(wav.toString('ascii', 8, 12), 'WAVE', 'wav file did not identify as WAVE');
        assert.equal(wav.toString('ascii', 12, 16), 'fmt ', 'wav file did not contain fmt chunk');
        assert.equal(wav.toString('ascii', 36, 40), 'data', 'wav file did not contain data chunk');
        assert.equal(wav.readUInt32LE(24), 8000, 'wav sample rate was incorrect');
        assert.equal(wav.readUInt16LE(34), 16, 'wav bit depth was incorrect');
        assert.equal(wav.readUInt32LE(40) > 0, true, 'wav file did not contain audio payload');
        assert.equal(wav.length > 44, true, 'wav file did not contain PCM samples');
    } finally {
        if (fs.existsSync(wavPath)) {
            fs.unlinkSync(wavPath);
        }
    }
})();

console.log('audio_wav_backend.test.js: ok');
