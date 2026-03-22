var j68 = require('../j68');
var Bus = require('./bus');
var memoryMap = require('./memory_map');
var CommandLoop = require('../monitor/command_loop');

// Generic j68 laboratory machine with an Amiga-shaped memory layout.
//
// The layout is intentional because it gives familiar ROM/RAM placement and
// leaves room for bring-up devices where expansion or motherboard resources
// usually live. It is not an Amiga implementation. No custom chips, CIAs,
// Gary, Autoconfig, or Exec behavior should be inferred from the address map.

function toUint8Array(data, size) {
    if (!data)
        return new Uint8Array(size);
    if (data instanceof Uint8Array) {
        if (data.length > size)
            throw new RangeError('image size mismatch');
        var copy = new Uint8Array(size);
        copy.set(data);
        return copy;
    }
    if (Buffer.isBuffer(data)) {
        if (data.length > size)
            throw new RangeError('image size mismatch');
        var fromBuffer = new Uint8Array(size);
        fromBuffer.set(data);
        return fromBuffer;
    }
    throw new TypeError('image must be a Uint8Array or Buffer');
}

function resolveCpuType(cpuType) {
    if (cpuType === undefined || cpuType === null)
        return j68.j68.TYPE_MC68000;
    if (typeof cpuType === 'number')
        return cpuType;

    switch (String(cpuType).toLowerCase()) {
        case '68000':
        case 'mc68000':
            return j68.j68.TYPE_MC68000;
        case '68020':
        case 'mc68020':
            return j68.j68.TYPE_MC68020;
        case '68030':
        case 'mc68030':
            return j68.j68.TYPE_MC68030;
        case '68040':
        case 'mc68040':
            return j68.j68.TYPE_MC68040;
    }
    throw new RangeError('unsupported CPU type: ' + cpuType);
}

function parseSizeOption(value, envName, fallback) {
    if (value !== undefined)
        return value >>> 0;
    if (!process.env[envName])
        return fallback >>> 0;
    return parseInt(process.env[envName], 0) >>> 0;
}

function TestMachine(options) {
    options = options || {};

    this.chipRamSize = parseSizeOption(options.chipRamSize, 'J68_CHIP_RAM_SIZE', memoryMap.CHIP_RAM_MAX_SIZE);
    this.fastRamSize = parseSizeOption(options.fastRamSize, 'J68_FAST_RAM_SIZE', memoryMap.FAST_RAM_MAX_SIZE);
    if (this.chipRamSize > memoryMap.CHIP_RAM_MAX_SIZE)
        throw new RangeError('chip RAM exceeds Amiga 24-bit chip RAM window');
    if (this.fastRamSize > memoryMap.FAST_RAM_MAX_SIZE)
        throw new RangeError('fast RAM exceeds Amiga 24-bit fast RAM window');

    this.chipRam = toUint8Array(options.chipRam, this.chipRamSize);
    this.fastRam = toUint8Array(options.fastRam, this.fastRamSize);
    this.rom = toUint8Array(options.rom, memoryMap.ROM_SIZE);
    this.overlayEnabled = options.overlay === undefined ? true : !!options.overlay;

    this.bus = new Bus({
        addressMask: 0x00ffffff,
        strictAlignment: true
    });
    this.bus.map(Bus.createMemoryRegion('chip-ram', memoryMap.CHIP_RAM_START, this.chipRamSize, this.chipRam, true));
    if (this.fastRamSize !== 0)
        this.bus.map(Bus.createMemoryRegion('fast-ram', memoryMap.FAST_RAM_START, this.fastRamSize, this.fastRam, true));
    this.bus.map(Bus.createMemoryRegion('rom', memoryMap.ROM_START, memoryMap.ROM_SIZE, this.rom, false));

    this.cpu = new j68.j68();
    this.cpu.type = resolveCpuType(options.cpuType);
    this.monitor = null;
    this.monitorTrapHandler = null;
    this.lastFault = null;
    this.pendingRun = null;
    this.asyncMonitorRun = false;
    this.asyncRunDefaultBudget = 5000000;
    this.asyncRunLongBudget = 50000000;
    this.intc = null;
    this.timers = [];
    this.nominalCpuHz = options.nominalCpuHz === undefined ? 1000000 : options.nominalCpuHz >>> 0;
    this.timerBaseHz = options.timerBaseHz === undefined ? 1000000 : options.timerBaseHz >>> 0;

    this.attachContextBus();
}

TestMachine.prototype.clearFault = function () {
    this.lastFault = null;
};

TestMachine.prototype.captureFault = function (error) {
    var context = this.cpu.context;
    var faultPc = context.pc >>> 0;
    var faultOp = 0;
    try {
        faultOp = context.fetch(faultPc) & 0xffff;
    } catch (ignored) {
        faultOp = 0;
    }
    context.halt = true;
    this.lastFault = {
        pc: faultPc,
        op: faultOp >>> 0,
        sr: context.sr & 0xffff,
        d0: context.d[0] >>> 0,
        d1: context.d[1] >>> 0,
        a0: context.a[0] >>> 0,
        a1: context.a[1] >>> 0,
        message: error && error.message ? error.message : String(error || 'fault')
    };
    return this.lastFault;
};

TestMachine.prototype.withSuppressedCoreNoise = function (fn) {
    var original = console.assert;
    var originalLog = this.cpu.log;
    console.assert = function (condition) {
        return condition;
    };
    this.cpu.log = function () {};
    try {
        return fn();
    } finally {
        console.assert = original;
        this.cpu.log = originalLog;
    }
};

TestMachine.prototype.isOverlayAddress = function (address) {
    address = this.bus.normalizeAddress(address);
    return this.overlayEnabled && address >= memoryMap.RESET_OVERLAY_START && address < memoryMap.RESET_OVERLAY_START + this.rom.length;
};

TestMachine.prototype.read8 = function (address, meta) {
    address = this.bus.normalizeAddress(address);
    if (this.isOverlayAddress(address))
        return this.rom[address - memoryMap.RESET_OVERLAY_START] & 0xff;
    return this.bus.read8(address, meta);
};

TestMachine.prototype.read16 = function (address, meta) {
    address = this.bus.normalizeAddress(address);
    this.bus.assertAligned(address, 2);
    if (this.isOverlayAddress(address) || this.isOverlayAddress(address + 1))
        return ((this.read8(address, meta) << 8) | this.read8(address + 1, meta)) >>> 0;
    return this.bus.read16(address, meta);
};

TestMachine.prototype.read32 = function (address, meta) {
    address = this.bus.normalizeAddress(address);
    this.bus.assertAligned(address, 4);
    if (this.isOverlayAddress(address) || this.isOverlayAddress(address + 3))
        return (((this.read16(address, meta) << 16) >>> 0) | this.read16(address + 2, meta)) >>> 0;
    return this.bus.read32(address, meta);
};

TestMachine.prototype.write8 = function (address, data, meta) {
    this.bus.write8(address >>> 0, data & 0xff, meta);
    this.cpu.context.c = {};
    return true;
};

TestMachine.prototype.write16 = function (address, data, meta) {
    this.bus.write16(address >>> 0, data & 0xffff, meta);
    this.cpu.context.c = {};
    return true;
};

TestMachine.prototype.write32 = function (address, data, meta) {
    this.bus.write32(address >>> 0, data >>> 0, meta);
    this.cpu.context.c = {};
    return true;
};

TestMachine.prototype.currentFunctionCode = function (kind) {
    var context = this.cpu.context;
    var supervisor;

    context.syncSr();
    supervisor = (context.sr & 0x2000) !== 0;
    if (kind === 'fetch')
        return supervisor ? Bus.FC_SUPERVISOR_PROGRAM : Bus.FC_USER_PROGRAM;
    return supervisor ? Bus.FC_SUPERVISOR_DATA : Bus.FC_USER_DATA;
};

TestMachine.prototype.busMeta = function (kind, value) {
    var meta = {
        fc: this.currentFunctionCode(kind),
        kind: kind,
        ipl: this.getInterruptLevel()
    };
    if (value !== undefined)
        meta.value = value >>> 0;
    return meta;
};

TestMachine.prototype.attachContextBus = function () {
    var self = this;
    var context = this.cpu.context;

    context.l8 = function (address) { return self.read8(address >>> 0, self.busMeta('read')); };
    context.l16 = function (address) { return self.read16(address >>> 0, self.busMeta('read')); };
    context.l32 = function (address) { return self.read32(address >>> 0, self.busMeta('read')); };
    context.fetch = function (address) { return self.read16(address >>> 0, self.busMeta('fetch')); };

    context.s8 = function (address, data) { return self.write8(address >>> 0, data & 0xff, self.busMeta('write', data)); };
    context.s16 = function (address, data) { return self.write16(address >>> 0, data & 0xffff, self.busMeta('write', data)); };
    context.s32 = function (address, data) { return self.write32(address >>> 0, data >>> 0, self.busMeta('write', data)); };
};

TestMachine.prototype.mapDevice = function (region) {
    if (region && typeof region.region === 'function')
        return this.bus.attach(region);
    return this.bus.map(region);
};

TestMachine.prototype.attachIntc = function (intc) {
    this.intc = intc;
    this.mapDevice(intc);
    return intc;
};

TestMachine.prototype.attachTimer = function (timer) {
    this.timers.push(timer);
    if (this.intc && !timer.intc)
        timer.attachIntc(this.intc);
    if (this.intc)
        this.intc.registerSource(timer.irqLevel, timer.acknowledge.bind(timer));
    this.mapDevice(timer);
    return timer;
};

TestMachine.prototype.primaryTimer = function () {
    return this.timers.length === 0 ? null : this.timers[0];
};

TestMachine.prototype.attachMonitor = function (uart, options) {
    var self = this;
    this.monitor = new CommandLoop(this, uart, options);
    this.monitorSuppressEnterPrompt = false;
    this.cpu.context.f = function (inst) {
        if (self.monitorTrapHandler && self.monitorTrapHandler(inst))
            return;
        if (inst !== 0xa000)
            throw new Error('unsupported monitor service $' + inst.toString(16));
        self.monitor.enter(self.monitorSuppressEnterPrompt);
        self.monitorSuppressEnterPrompt = false;
        self.cpu.context.halt = true;
    };
    return this.monitor;
};

TestMachine.prototype.setOverlay = function (enabled) {
    this.overlayEnabled = !!enabled;
};

TestMachine.prototype.reset = function () {
    var context = this.cpu.context;
    this.bus.reset();
    this.pendingRun = null;
    context.c = {};
    context.halt = false;
    context.i = 0;
    context.vbr = 0;
    context.setSr(0x2700);
    context.a[7] = this.read32(0) >>> 0;
    context.ssp = context.a[7] >>> 0;
    context.pc = this.read32(4) >>> 0;
};

TestMachine.prototype.acceptInterrupt = function (level) {
    var context = this.cpu.context;
    var vector = 24 + level;
    context.syncSr();
    var oldSr = context.sr & 0xffff;
    if ((oldSr & 0x2000) === 0) {
        context.usp = context.a[7] >>> 0;
        context.a[7] = context.ssp >>> 0;
    }
    context.a[7] = (context.a[7] - 6) >>> 0;
    context.s16(context.a[7], oldSr);
    context.s32(context.a[7] + 2, context.pc >>> 0);
    context.ssp = context.a[7] >>> 0;
    context.setSr(((oldSr & 0x00ff) | 0x2000 | ((level & 7) << 8)) & 0xffff);
    context.pc = this.read32(vector << 2) >>> 0;
    context.c = {};
    context.halt = false;
    if (this.intc)
        this.intc.acknowledge(level);
};

TestMachine.prototype.advanceDevices = function (instructions) {
    if (instructions <= 0)
        return;
    this.bus.advance(instructions);
};

TestMachine.prototype.pollInterrupts = function () {
    var level = this.getInterruptLevel();
    if (level === 0)
        return 0;
    var currentMask = (this.cpu.context.sr >> 8) & 7;
    if (level <= currentMask)
        return 0;
    this.acceptInterrupt(level);
    return level;
};

TestMachine.prototype.getInterruptLevel = function () {
    if (this.intc)
        return this.intc.highestPending();
    return this.bus.resolveIpl();
};

TestMachine.prototype.runBlock = function () {
    var context = this.cpu.context;
    this.pollInterrupts();
    if (context.halt)
        return false;
    try {
        var pc = context.pc >>> 0;
        var beforeInstructions = context.i >>> 0;
        if (!context.c[pc])
            context.c[pc] = this.withSuppressedCoreNoise(function () {
                return this.cpu.compile();
            }.bind(this));
        this.withSuppressedCoreNoise(function () {
            context.c[pc](context);
        });
        this.advanceDevices((context.i - beforeInstructions) >>> 0);
        return true;
    } catch (error) {
        this.captureFault(error);
        return false;
    }
};

TestMachine.prototype.runBlocks = function (maxBlocks) {
    var blocks = maxBlocks === undefined ? 1 : maxBlocks | 0;
    for (var i = 0; i < blocks; ++i) {
        if (!this.runBlock())
            break;
    }
};

TestMachine.prototype.pollMonitor = function () {
    if (this.monitor && this.monitor.active)
        this.monitor.poll();
};

TestMachine.prototype.runUntil = function (predicate, maxBlocks) {
    var limit = maxBlocks === undefined ? 1000 : maxBlocks | 0;
    for (var i = 0; i < limit; ++i) {
        if (predicate(this))
            return true;
        if (!this.runBlock())
            return predicate(this);
    }
    return predicate(this);
};

TestMachine.prototype.runUntilInstruction = function (predicate, maxInstructions) {
    var limit = maxInstructions === undefined ? 1000 : maxInstructions | 0;
    for (var i = 0; i < limit; ++i) {
        if (predicate(this))
            return true;
        if (!this.stepInstruction())
            return predicate(this);
    }
    return predicate(this);
};

TestMachine.prototype.stepInstruction = function () {
    var context = this.cpu.context;
    this.pollInterrupts();
    if (context.halt)
        return null;

    try {
        var pc = context.pc >>> 0;
        var decoded = this.withSuppressedCoreNoise(function () {
            return this.cpu.decode(pc);
        }.bind(this));
        var code = decoded.code;
        var lines = [];
        var outFlags = decoded.out || {};
        var flagOrder = [ 'x', 'n', 'z', 'v', 'c' ];
        var writesPc = !!(decoded.in && decoded.in.pc);
        var i;

        if (decoded.in && decoded.in.sr)
            lines.push('c.syncSr();');
        if (decoded.in && decoded.in.pc)
            lines.push('c.pc=' + (decoded.pc >>> 0) + ';');
        lines = lines.concat(Array.isArray(code) ? code.slice() : [ code || '' ]);
        for (i = 0; i < lines.length; ++i) {
            if (/c\.pc\s*=/.test(lines[i])) {
                writesPc = true;
                break;
            }
        }
        for (i = 0; i < flagOrder.length; ++i) {
            var flag = flagOrder[i];
            if (outFlags[flag])
                lines.push('c.c' + flag + '=' + outFlags[flag] + ';');
        }
        if (!writesPc)
            lines.push('c.pc=' + (decoded.pc >>> 0) + ';');
        if (decoded.error)
            lines.push('c.halt=true;');
        lines.push('c.i+=1;');

        this.withSuppressedCoreNoise(function () {
            new Function('c', lines.join('\n'))(context);
        });
        this.advanceDevices(1);
        return decoded;
    } catch (error) {
        this.captureFault(error);
        return null;
    }
};

TestMachine.prototype.loadRomBytes = function (address, bytes) {
    address >>>= 0;
    if (address < memoryMap.ROM_START || address + bytes.length - 1 > memoryMap.ROM_END)
        throw new RangeError('ROM write outside mapped range');
    this.rom.set(bytes, address - memoryMap.ROM_START);
};

TestMachine.prototype.loadChipRamBytes = function (address, bytes) {
    address >>>= 0;
    if (address < memoryMap.CHIP_RAM_START || address + bytes.length - 1 >= memoryMap.CHIP_RAM_START + this.chipRam.length)
        throw new RangeError('chip RAM write outside mapped range');
    this.chipRam.set(bytes, address - memoryMap.CHIP_RAM_START);
};

TestMachine.prototype.loadFastRamBytes = function (address, bytes) {
    address >>>= 0;
    if (this.fastRamSize === 0)
        throw new RangeError('fast RAM not configured');
    if (address < memoryMap.FAST_RAM_START || address + bytes.length - 1 >= memoryMap.FAST_RAM_START + this.fastRam.length)
        throw new RangeError('fast RAM write outside mapped range');
    this.fastRam.set(bytes, address - memoryMap.FAST_RAM_START);
};

module.exports = TestMachine;
