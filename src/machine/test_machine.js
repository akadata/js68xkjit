var j68 = require('../j68');
var Bus = require('./bus');
var memoryMap = require('./memory_map');

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

function TestMachine(options) {
    options = options || {};

    this.chipRamSize = options.chipRamSize === undefined ? memoryMap.CHIP_RAM_MAX_SIZE : options.chipRamSize >>> 0;
    this.fastRamSize = options.fastRamSize === undefined ? memoryMap.FAST_RAM_MAX_SIZE : options.fastRamSize >>> 0;
    if (this.chipRamSize > memoryMap.CHIP_RAM_MAX_SIZE)
        throw new RangeError('chip RAM exceeds Amiga 24-bit chip RAM window');
    if (this.fastRamSize > memoryMap.FAST_RAM_MAX_SIZE)
        throw new RangeError('fast RAM exceeds Amiga 24-bit fast RAM window');

    this.chipRam = toUint8Array(options.chipRam, this.chipRamSize);
    this.fastRam = toUint8Array(options.fastRam, this.fastRamSize);
    this.rom = toUint8Array(options.rom, memoryMap.ROM_SIZE);
    this.overlayEnabled = options.overlay === undefined ? true : !!options.overlay;

    this.bus = new Bus();
    this.bus.map(Bus.createMemoryRegion('chip-ram', memoryMap.CHIP_RAM_START, this.chipRamSize, this.chipRam, true));
    if (this.fastRamSize !== 0)
        this.bus.map(Bus.createMemoryRegion('fast-ram', memoryMap.FAST_RAM_START, this.fastRamSize, this.fastRam, true));
    this.bus.map(Bus.createMemoryRegion('rom', memoryMap.ROM_START, memoryMap.ROM_SIZE, this.rom, false));

    this.cpu = new j68.j68();
    this.cpu.type = resolveCpuType(options.cpuType);

    this.attachContextBus();
}

TestMachine.prototype.isOverlayAddress = function (address) {
    address >>>= 0;
    return this.overlayEnabled && address >= memoryMap.RESET_OVERLAY_START && address < memoryMap.RESET_OVERLAY_START + this.rom.length;
};

TestMachine.prototype.read8 = function (address) {
    address >>>= 0;
    if (this.isOverlayAddress(address))
        return this.rom[address - memoryMap.RESET_OVERLAY_START] & 0xff;
    return this.bus.read8(address);
};

TestMachine.prototype.read16 = function (address) {
    address >>>= 0;
    return ((this.read8(address) << 8) | this.read8(address + 1)) >>> 0;
};

TestMachine.prototype.read32 = function (address) {
    address >>>= 0;
    return (((this.read16(address) << 16) >>> 0) | this.read16(address + 2)) >>> 0;
};

TestMachine.prototype.write8 = function (address, data) {
    this.bus.write8(address >>> 0, data & 0xff);
    this.cpu.context.c = {};
    return true;
};

TestMachine.prototype.write16 = function (address, data) {
    this.bus.write16(address >>> 0, data & 0xffff);
    this.cpu.context.c = {};
    return true;
};

TestMachine.prototype.write32 = function (address, data) {
    this.bus.write32(address >>> 0, data >>> 0);
    this.cpu.context.c = {};
    return true;
};

TestMachine.prototype.attachContextBus = function () {
    var self = this;
    var context = this.cpu.context;

    context.l8 = function (address) { return self.read8(address >>> 0); };
    context.l16 = function (address) { return self.read16(address >>> 0); };
    context.l32 = function (address) { return self.read32(address >>> 0); };
    context.fetch = function (address) { return self.read16(address >>> 0); };

    context.s8 = function (address, data) { return self.write8(address >>> 0, data & 0xff); };
    context.s16 = function (address, data) { return self.write16(address >>> 0, data & 0xffff); };
    context.s32 = function (address, data) { return self.write32(address >>> 0, data >>> 0); };
};

TestMachine.prototype.mapDevice = function (region) {
    return this.bus.map(region);
};

TestMachine.prototype.setOverlay = function (enabled) {
    this.overlayEnabled = !!enabled;
};

TestMachine.prototype.reset = function () {
    var context = this.cpu.context;
    context.c = {};
    context.halt = false;
    context.i = 0;
    context.vbr = 0;
    context.setSr(0x2700);
    context.a[7] = this.read32(0) >>> 0;
    context.ssp = context.a[7] >>> 0;
    context.pc = this.read32(4) >>> 0;
};

TestMachine.prototype.runBlock = function () {
    var context = this.cpu.context;
    if (context.halt)
        return false;
    var pc = context.pc >>> 0;
    if (!context.c[pc])
        context.c[pc] = this.cpu.compile();
    context.c[pc](context);
    return true;
};

TestMachine.prototype.runBlocks = function (maxBlocks) {
    var blocks = maxBlocks === undefined ? 1 : maxBlocks | 0;
    for (var i = 0; i < blocks; ++i) {
        if (!this.runBlock())
            break;
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
