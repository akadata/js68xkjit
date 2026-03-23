var childProcess = require('child_process');
var fs = require('fs');
var memoryMap = require('../memory_map');
var path = require('path');
var registerMap = require('../registers/audio.js');

var GLOBAL = registerMap.GLOBAL_CTRL_BITS;
var STATUS = registerMap.GLOBAL_STATUS_BITS;
var CHCTRL = registerMap.CH_CTRL_BITS;
var CHSTATE = registerMap.CH_STATE_BITS;
var WAVE = registerMap.CH_WAVE_TYPES;

function clampSample(value) {
    if (value > 1)
        return 1;
    if (value < -1)
        return -1;
    return value;
}

function nibbleSeconds(value, fastSeconds, slowSeconds) {
    var t = (value & 0xf) / 15;
    return fastSeconds + ((slowSeconds - fastSeconds) * t);
}

function nullBackend() {
    return {
        type: 'null',
        writeSamples: function () {},
        close: function () {}
    };
}

function writeWavHeader(fd, sampleRate, dataBytes) {
    var header = Buffer.alloc(44);
    header.write('RIFF', 0, 4, 'ascii');
    header.writeUInt32LE((36 + dataBytes) >>> 0, 4);
    header.write('WAVE', 8, 4, 'ascii');
    header.write('fmt ', 12, 4, 'ascii');
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(sampleRate >>> 0, 24);
    header.writeUInt32LE((sampleRate * 2) >>> 0, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36, 4, 'ascii');
    header.writeUInt32LE(dataBytes >>> 0, 40);
    fs.writeSync(fd, header, 0, header.length, 0);
}

function wavBackend(sampleRate, wavPath) {
    var outPath = wavPath || process.env.J68_AUDIO_WAV_PATH || path.join(process.cwd(), 'save', 'j68-audio.wav');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    var fd = fs.openSync(outPath, 'w');
    var closed = false;
    var dataBytes = 0;
    var writeOffset = 44;

    writeWavHeader(fd, sampleRate, 0);

    return {
        type: 'wav',
        path: outPath,
        writeSamples: function (buffer) {
            if (closed || !buffer || buffer.length === 0)
                return;
            fs.writeSync(fd, buffer, 0, buffer.length, writeOffset);
            writeOffset = (writeOffset + buffer.length) >>> 0;
            dataBytes = (dataBytes + buffer.length) >>> 0;
        },
        close: function () {
            if (closed)
                return;
            closed = true;
            writeWavHeader(fd, sampleRate, dataBytes);
            fs.closeSync(fd);
        }
    };
}

function ffplayBackend(sampleRate) {
    var warning = { logged: false };
    var args = [
        '-nodisp',
        '-loglevel', 'quiet',
        '-f', 's16le',
        '-ar', String(sampleRate >>> 0),
        '-ch_layout', 'mono',
        '-autoexit',
        '-i', 'pipe:0'
    ];
    var child = childProcess.spawn('ffplay', args, {
        stdio: [ 'pipe', 'ignore', 'ignore' ]
    });
    var alive = true;

    function disableBackend(message) {
        alive = false;
        if (!warning.logged) {
            warning.logged = true;
            console.error(message);
        }
    }

    child.on('error', function () {
        disableBackend('j68: audio backend ffplay unavailable, using null backend');
    });
    child.on('exit', function () {
        alive = false;
    });
    if (child.stdin) {
        child.stdin.on('error', function () {
            disableBackend('j68: audio backend ffplay pipe closed, disabling audio output');
        });
        child.stdin.on('close', function () {
            alive = false;
        });
    }

    return {
        type: 'ffplay',
        writeSamples: function (buffer) {
            if (!alive || !child.stdin || child.stdin.destroyed || !buffer || buffer.length === 0)
                return;
            try {
                child.stdin.write(buffer);
            } catch (error) {
                disableBackend('j68: audio backend ffplay pipe closed, disabling audio output');
            }
        },
        close: function () {
            if (!alive)
                return;
            alive = false;
            if (child.stdin && !child.stdin.destroyed)
                child.stdin.end();
            child.kill('SIGTERM');
        }
    };
}

function createChannel() {
    return {
        freq: 0,
        pulseWidth: 0x8000,
        ctrl: 0,
        ad: 0,
        sr: 0,
        vol: 0,
        pan: 0x80,
        phase: 0,
        phaseMsb: 0,
        env: 0,
        envState: 'idle',
        stateBits: 0,
        releaseStep: 0,
        noiseLfsr: 0x5a17
    };
}

function createChannels(count) {
    var channels = [];
    for (var i = 0; i < count; ++i)
        channels.push(createChannel());
    return channels;
}

function Sound(options) {
    options = options || {};
    this.name = 'sound';
    this.start = options.start === undefined ? memoryMap.AUDIO_START : options.start >>> 0;
    this.end = (this.start + memoryMap.AUDIO_SIZE - 1) >>> 0;
    this.baseHz = options.baseHz === undefined ? 1000000 : options.baseHz >>> 0;
    this.sampleRate = options.sampleRate === undefined ? 44100 : options.sampleRate >>> 0;
    this.backendName = options.backend || process.env.J68_AUDIO_BACKEND || 'ffplay';
    this.wavPath = options.wavPath || process.env.J68_AUDIO_WAV_PATH || null;
    this.channelCount = options.channelCount === undefined ? 2 : Math.max(1, options.channelCount | 0);
    this.backend = null;
    this.backendWarningShown = false;
    this.globalCtrl = 0;
    this.masterVol = 0x00ff;
    this.sampleRateHint = this.sampleRate >>> 0;
    this.channelIndex = 0;
    this.channels = createChannels(this.channelCount);
    this.generatedSamples = 0;
    this.sampleAccumulator = 0;
    this.fractionalSamples = 0;
    this.device = this;
    this.clip = false;

    var self = this;
    process.once('exit', function () {
        if (self.backend)
            self.backend.close();
    });
}

Sound.prototype.ensureBackend = function () {
    if (this.backend)
        return this.backend;
    if (this.backendName === 'null' || this.backendName === 'none') {
        this.backend = nullBackend();
        return this.backend;
    }
    if (this.backendName === 'wav') {
        this.backend = wavBackend(this.sampleRate, this.wavPath);
        return this.backend;
    }
    try {
        this.backend = ffplayBackend(this.sampleRate);
    } catch (error) {
        if (!this.backendWarningShown) {
            this.backendWarningShown = true;
            console.error('j68: audio backend ffplay unavailable, using null backend');
        }
        this.backend = nullBackend();
    }
    return this.backend;
};

Sound.prototype.region = function () {
    return this;
};

Sound.prototype.reset = function () {
    this.globalCtrl = 0;
    this.masterVol = 0x00ff;
    this.sampleRateHint = this.sampleRate >>> 0;
    this.channelIndex = 0;
    this.channels = createChannels(this.channelCount);
    this.generatedSamples = 0;
    this.sampleAccumulator = 0;
    this.fractionalSamples = 0;
    this.clip = false;
};

Sound.prototype.selectedChannel = function () {
    return this.channels[this.channelIndex] || this.channels[0];
};

Sound.prototype.globalStatus = function () {
    var busy = false;
    for (var i = 0; i < this.channels.length; ++i) {
        if (this.channels[i].stateBits & CHSTATE.ACTIVE) {
            busy = true;
            break;
        }
    }
    var status = 0;
    if ((this.globalCtrl & GLOBAL.ENABLE) !== 0)
        status |= STATUS.ENABLED;
    if (busy)
        status |= STATUS.BUSY;
    if (this.clip)
        status |= STATUS.CLIPPING;
    return status;
};

Sound.prototype.updateStateBits = function (channel) {
    var bits = 0;
    if ((channel.ctrl & CHCTRL.ENABLE) !== 0 && channel.env > 0.0001)
        bits |= CHSTATE.ACTIVE;
    if (channel.envState === 'attack')
        bits |= CHSTATE.ATTACK;
    else if (channel.envState === 'decay')
        bits |= CHSTATE.DECAY;
    else if (channel.envState === 'sustain')
        bits |= CHSTATE.SUSTAIN;
    else if (channel.envState === 'release')
        bits |= CHSTATE.RELEASE;
    channel.stateBits = bits;
};

Sound.prototype.sustainLevel = function (channel) {
    return ((channel.sr >> 4) & 0xf) / 15;
};

Sound.prototype.handleGateWrite = function (channel, oldCtrl, newCtrl) {
    var oldGate = (oldCtrl & CHCTRL.GATE) !== 0;
    var newGate = (newCtrl & CHCTRL.GATE) !== 0;
    if (oldGate === newGate)
        return;
    if (newGate) {
        channel.envState = 'attack';
        if (channel.env < 0)
            channel.env = 0;
    } else if (channel.env > 0.0001) {
        channel.envState = 'release';
        channel.releaseStep = channel.env / (nibbleSeconds(channel.sr & 0xf, 0.01, 1.2) * this.sampleRate);
    } else {
        channel.env = 0;
        channel.envState = 'idle';
    }
    this.updateStateBits(channel);
};

Sound.prototype.writeRegister16 = function (offset, value) {
    var channel = this.selectedChannel();
    value &= 0xffff;
    switch (offset) {
        case registerMap.GLOBAL_CTRL:
            if (value & GLOBAL.RESET)
                this.reset();
            this.globalCtrl = value & ~GLOBAL.RESET;
            break;
        case registerMap.MASTER_VOL:
            this.masterVol = value & 0x00ff;
            break;
        case registerMap.SAMPLE_RATE:
            if (value !== 0)
                this.sampleRateHint = value >>> 0;
            break;
        case registerMap.CH_INDEX:
            this.channelIndex = value % this.channels.length;
            break;
        case registerMap.CH_FREQ_HI:
            channel.freq = (((value & 0xffff) << 16) | (channel.freq & 0xffff)) >>> 0;
            break;
        case registerMap.CH_FREQ_LO:
            channel.freq = ((channel.freq & 0xffff0000) | (value & 0xffff)) >>> 0;
            break;
        case registerMap.CH_PW:
            channel.pulseWidth = value & 0xffff;
            break;
        case registerMap.CH_CTRL:
            var oldCtrl = channel.ctrl;
            channel.ctrl = value & 0xffff;
            this.handleGateWrite(channel, oldCtrl, channel.ctrl);
            this.updateStateBits(channel);
            break;
        case registerMap.CH_AD:
            channel.ad = value & 0xff;
            break;
        case registerMap.CH_SR:
            channel.sr = value & 0xff;
            break;
        case registerMap.CH_VOL:
            channel.vol = value & 0x00ff;
            break;
        case registerMap.CH_PAN:
            channel.pan = value & 0x00ff;
            break;
    }
};

Sound.prototype.readRegister16 = function (offset) {
    var channel = this.selectedChannel();
    switch (offset) {
        case registerMap.GLOBAL_ID:
            return 0xA601;
        case registerMap.GLOBAL_CTRL:
            return this.globalCtrl & 0xffff;
        case registerMap.GLOBAL_STATUS:
            return this.globalStatus() & 0xffff;
        case registerMap.MASTER_VOL:
            return this.masterVol & 0xffff;
        case registerMap.SAMPLE_RATE:
            return this.sampleRateHint & 0xffff;
        case registerMap.CHANNEL_COUNT:
            return this.channels.length & 0xffff;
        case registerMap.IRQ_ENABLE:
        case registerMap.IRQ_STATUS:
            return 0;
        case registerMap.CH_INDEX:
            return this.channelIndex & 0xffff;
        case registerMap.CH_FREQ_HI:
            return (channel.freq >>> 16) & 0xffff;
        case registerMap.CH_FREQ_LO:
            return channel.freq & 0xffff;
        case registerMap.CH_PW:
            return channel.pulseWidth & 0xffff;
        case registerMap.CH_CTRL:
            return channel.ctrl & 0xffff;
        case registerMap.CH_AD:
            return channel.ad & 0xffff;
        case registerMap.CH_SR:
            return channel.sr & 0xffff;
        case registerMap.CH_VOL:
            return channel.vol & 0xffff;
        case registerMap.CH_PAN:
            return channel.pan & 0xffff;
        case registerMap.CH_STATE:
            return channel.stateBits & 0xffff;
        case registerMap.CH_ENV_LEVEL:
            return Math.max(0, Math.min(0xffff, Math.round(channel.env * 0xffff))) & 0xffff;
        case registerMap.CH_PHASE_HI:
            return (channel.phase >>> 16) & 0xffff;
        case registerMap.CH_PHASE_LO:
            return channel.phase & 0xffff;
        default:
            return 0;
    }
};

Sound.prototype.read8 = function (address) {
    var offset = (address - this.start) >>> 0;
    var value = this.readRegister16(offset & ~1);
    if ((offset & 1) === 0)
        return (value >>> 8) & 0xff;
    return value & 0xff;
};

Sound.prototype.write8 = function (address, value) {
    var offset = (address - this.start) >>> 0;
    var reg = offset & ~1;
    var current = this.readRegister16(reg);
    if ((offset & 1) === 0)
        current = ((value & 0xff) << 8) | (current & 0x00ff);
    else
        current = (current & 0xff00) | (value & 0xff);
    this.writeRegister16(reg, current);
};

Sound.prototype.read16 = function (address) {
    return this.readRegister16((address - this.start) >>> 0) & 0xffff;
};

Sound.prototype.write16 = function (address, value) {
    this.writeRegister16((address - this.start) >>> 0, value & 0xffff);
};

Sound.prototype.waveSample = function (channel) {
    var wave = (channel.ctrl & registerMap.CH_WAVE_MASK) >> registerMap.CH_WAVE_SHIFT;
    var phase = channel.phase >>> 0;
    var msb = (phase >>> 31) & 1;
    if (wave === WAVE.SAW)
        return ((phase / 0x80000000) - 1);
    if (wave === WAVE.SINE)
        return Math.sin((phase / 0xffffffff) * Math.PI * 2);
    if (wave === WAVE.NOISE) {
        if (msb !== channel.phaseMsb) {
            var feedback = ((channel.noiseLfsr ^ (channel.noiseLfsr >>> 2) ^ (channel.noiseLfsr >>> 3) ^ (channel.noiseLfsr >>> 5)) & 1);
            channel.noiseLfsr = ((channel.noiseLfsr >>> 1) | (feedback << 15)) & 0xffff;
            channel.phaseMsb = msb;
        }
        return (channel.noiseLfsr & 1) ? 1 : -1;
    }
    channel.phaseMsb = msb;
    var threshold = ((channel.pulseWidth & 0xffff) << 16) >>> 0;
    if (threshold === 0)
        threshold = 0x80000000;
    return phase < threshold ? 1 : -1;
};

Sound.prototype.stepEnvelope = function (channel) {
    var sustain = this.sustainLevel(channel);
    if ((channel.ctrl & CHCTRL.ENABLE) === 0) {
        channel.env = 0;
        channel.envState = 'idle';
        this.updateStateBits(channel);
        return 0;
    }
    if (channel.envState === 'attack') {
        channel.env += 1 / (nibbleSeconds((channel.ad >> 4) & 0xf, 0.002, 0.4) * this.sampleRate);
        if (channel.env >= 1) {
            channel.env = 1;
            channel.envState = 'decay';
        }
    } else if (channel.envState === 'decay') {
        channel.env -= (1 - sustain) / (nibbleSeconds(channel.ad & 0xf, 0.01, 0.8) * this.sampleRate);
        if (channel.env <= sustain) {
            channel.env = sustain;
            channel.envState = 'sustain';
        }
    } else if (channel.envState === 'sustain') {
        channel.env = sustain;
    } else if (channel.envState === 'release') {
        channel.env -= channel.releaseStep || (1 / (0.05 * this.sampleRate));
        if (channel.env <= 0) {
            channel.env = 0;
            channel.envState = 'idle';
        }
    }
    this.updateStateBits(channel);
    return channel.env;
};

Sound.prototype.generateSample = function () {
    if ((this.globalCtrl & GLOBAL.ENABLE) === 0 || (this.globalCtrl & GLOBAL.MUTE) !== 0)
        return 0;
    var mixed = 0;
    var active = 0;
    var masterGain = (this.masterVol & 0xff) / 255;
    for (var i = 0; i < this.channels.length; ++i) {
        var channel = this.channels[i];
        var env = this.stepEnvelope(channel);
        channel.phase = (channel.phase + channel.freq) >>> 0;
        if (env <= 0.0001)
            continue;
        var gain = env * ((channel.vol & 0xff) / 255) * masterGain;
        mixed += this.waveSample(channel) * gain;
        active += 1;
    }
    if (active === 0)
        return 0;
    return mixed;
};

Sound.prototype.advance = function (cycles) {
    cycles >>>= 0;
    if (cycles === 0)
        return;
    this.sampleAccumulator += cycles * this.sampleRate;
    if (this.sampleAccumulator < this.baseHz)
        return;

    var count = Math.floor(this.sampleAccumulator / this.baseHz);
    this.sampleAccumulator -= count * this.baseHz;
    if (count <= 0)
        return;

    var buffer = Buffer.alloc(count * 2);
    this.clip = false;
    for (var i = 0; i < count; ++i) {
        var mixed = this.generateSample();
        if (mixed > 1 || mixed < -1)
            this.clip = true;
        var sample = Math.round(clampSample(mixed) * 32767);
        buffer.writeInt16LE(sample, i * 2);
    }
    this.generatedSamples = (this.generatedSamples + count) >>> 0;
    this.ensureBackend().writeSamples(buffer);
};

Sound.prototype.advanceTime = function (seconds) {
    if (!(seconds > 0))
        return;
    this.fractionalSamples += seconds * this.sampleRate;
    if (this.fractionalSamples < 1)
        return;

    var count = Math.floor(this.fractionalSamples);
    this.fractionalSamples -= count;
    if (count <= 0)
        return;

    var buffer = Buffer.alloc(count * 2);
    this.clip = false;
    for (var i = 0; i < count; ++i) {
        var mixed = this.generateSample();
        if (mixed > 1 || mixed < -1)
            this.clip = true;
        var sample = Math.round(clampSample(mixed) * 32767);
        buffer.writeInt16LE(sample, i * 2);
    }
    this.generatedSamples = (this.generatedSamples + count) >>> 0;
    this.ensureBackend().writeSamples(buffer);
};

module.exports = Sound;
