var createMemoryRegion = require('./region');
var addressing = require('./addressing');
var errors = require('./errors');

function rangeContains(start, end, address, size) {
    var last = (address + size - 1) >>> 0;
    return address >= start && last <= end;
}

function uniqueDevices(regions) {
    var seen = [];
    var devices = [];
    for (var i = 0; i < regions.length; ++i) {
        var device = regions[i].device || regions[i];
        if (seen.indexOf(device) === -1) {
            seen.push(device);
            devices.push(device);
        }
    }
    return devices;
}

function requireWidth(region, size, write) {
    var op = write ? 'write' : 'read';
    if (size === 1 && typeof region[op + '8'] === 'function')
        return;
    if (size === 2 && typeof region[op + '16'] === 'function')
        return;
    if (size === 4 && typeof region[op + '32'] === 'function')
        return;
    throw new RangeError(region.name + ' rejects ' + (size * 8) + '-bit ' + op);
}

function readRegion(region, address, size) {
    if (region.strictSizes)
        requireWidth(region, size, false);
    if (size === 1) {
        if (typeof region.read8 !== 'function')
            throw new RangeError(region.name + ' does not support byte reads');
        return region.read8(address) & 0xff;
    }
    if (size === 2) {
        if (typeof region.read16 === 'function')
            return region.read16(address) & 0xffff;
        if (typeof region.read8 !== 'function')
            throw new RangeError(region.name + ' does not support word reads');
        return ((region.read8(address) << 8) | region.read8(address + 1)) & 0xffff;
    }
    if (size === 4) {
        if (typeof region.read32 === 'function')
            return region.read32(address) >>> 0;
        if (typeof region.read16 === 'function')
            return (((region.read16(address) << 16) >>> 0) | region.read16(address + 2)) >>> 0;
        if (typeof region.read8 !== 'function')
            throw new RangeError(region.name + ' does not support long reads');
        return ((((region.read8(address) << 24) >>> 0) |
            (region.read8(address + 1) << 16) |
            (region.read8(address + 2) << 8) |
            region.read8(address + 3)) >>> 0);
    }
    throw new RangeError('unsupported bus read size: ' + size);
}

function writeRegion(region, address, size, value) {
    if (region.strictSizes)
        requireWidth(region, size, true);
    if (size === 1) {
        if (typeof region.write8 !== 'function')
            throw new RangeError(region.name + ' does not support byte writes');
        region.write8(address, value & 0xff);
        return;
    }
    if (size === 2) {
        if (typeof region.write16 === 'function') {
            region.write16(address, value & 0xffff);
            return;
        }
        if (typeof region.write8 !== 'function')
            throw new RangeError(region.name + ' does not support word writes');
        region.write8(address, (value >>> 8) & 0xff);
        region.write8(address + 1, value & 0xff);
        return;
    }
    if (size === 4) {
        if (typeof region.write32 === 'function') {
            region.write32(address, value >>> 0);
            return;
        }
        if (typeof region.write16 === 'function') {
            region.write16(address, (value >>> 16) & 0xffff);
            region.write16(address + 2, value & 0xffff);
            return;
        }
        if (typeof region.write8 !== 'function')
            throw new RangeError(region.name + ' does not support long writes');
        region.write8(address, (value >>> 24) & 0xff);
        region.write8(address + 1, (value >>> 16) & 0xff);
        region.write8(address + 2, (value >>> 8) & 0xff);
        region.write8(address + 3, value & 0xff);
        return;
    }
    throw new RangeError('unsupported bus write size: ' + size);
}

function Bus(options) {
    var opts = options || {};
    this.regions = [];
    this.addressMask = opts.addressMask === undefined ? 0x00ffffff : opts.addressMask >>> 0;
    this.strictAlignment = opts.strictAlignment === undefined ? true : !!opts.strictAlignment;
    this.traceHook = typeof opts.traceHook === 'function' ? opts.traceHook : null;
    this.lastTransaction = null;
}

Bus.createMemoryRegion = createMemoryRegion;
Bus.errors = errors;
Bus.FC_USER_DATA = 1;
Bus.FC_USER_PROGRAM = 2;
Bus.FC_SUPERVISOR_DATA = 5;
Bus.FC_SUPERVISOR_PROGRAM = 6;

Bus.prototype.normalizeAddress = function (address) {
    return addressing.normalizeAddress(address, this.addressMask);
};

Bus.prototype.assertAligned = function (address, size) {
    addressing.assertAligned(address, size, this.strictAlignment);
};

Bus.prototype.attach = function (device) {
    if (!device || typeof device.region !== 'function')
        throw new TypeError('device does not expose region()');
    return this.map(device.region());
};

Bus.prototype.map = function (region) {
    if (!region || typeof region.start !== 'number' || typeof region.end !== 'number')
        throw new TypeError('invalid region');
    region.start = this.normalizeAddress(region.start);
    region.end = this.normalizeAddress(region.end);
    for (var i = 0; i < this.regions.length; ++i) {
        var existing = this.regions[i];
        if (!(region.end < existing.start || region.start > existing.end))
            throw new RangeError('overlapping region: ' + region.name + ' with ' + existing.name);
    }
    this.regions.push(region);
    this.regions.sort(function (a, b) {
        return a.start - b.start;
    });
    return region;
};

Bus.prototype.unmap = function (nameOrRegion) {
    for (var i = 0; i < this.regions.length; ++i) {
        var region = this.regions[i];
        if (region === nameOrRegion || region.name === nameOrRegion) {
            this.regions.splice(i, 1);
            return true;
        }
    }
    return false;
};

Bus.prototype.regionFor = function (address, size) {
    var normalized = this.normalizeAddress(address);
    for (var i = 0; i < this.regions.length; ++i) {
        var region = this.regions[i];
        if (rangeContains(region.start, region.end, normalized, size))
            return region;
    }
    throw new errors.UnmappedAccessError(normalized, size);
};

Bus.prototype.trace = function (kind, size, address, value, region) {
    if (!this.traceHook)
        return;
    this.traceHook({
        kind: kind,
        size: size | 0,
        address: address >>> 0,
        value: value >>> 0,
        region: region ? region.name : null
    });
};

Bus.prototype.createTransaction = function (address, size, write, meta) {
    var txMeta = meta || {};
    return {
        addr: this.normalizeAddress(address),
        size: size | 0,
        write: !!write,
        value: txMeta.value === undefined ? 0 : txMeta.value >>> 0,
        fc: txMeta.fc === undefined ? 0 : txMeta.fc & 7,
        ipl: txMeta.ipl === undefined ? 0 : txMeta.ipl & 7,
        kind: txMeta.kind || (write ? 'write' : 'read'),
        berr: false,
        region: null,
        error: null
    };
};

Bus.prototype.transact = function (transaction) {
    var tx = transaction;
    try {
        this.assertAligned(tx.addr, tx.size);
        tx.region = this.regionFor(tx.addr, tx.size);
        if (tx.write)
            writeRegion(tx.region, tx.addr, tx.size, tx.value);
        else
            tx.value = readRegion(tx.region, tx.addr, tx.size) >>> 0;
        tx.berr = false;
        this.trace(tx.write ? 'write' : 'read', tx.size, tx.addr, tx.value, tx.region);
    } catch (error) {
        tx.berr = true;
        tx.error = error;
    }
    this.lastTransaction = tx;
    return tx;
};

Bus.prototype.resolveIpl = function () {
    var devices = uniqueDevices(this.regions);
    var highest = 0;
    for (var i = 0; i < devices.length; ++i) {
        if (typeof devices[i].getInterruptLevel === 'function') {
            var level = devices[i].getInterruptLevel() | 0;
            if (level > highest)
                highest = level;
        }
    }
    return highest;
};

Bus.prototype.read8 = function (address, meta) {
    var tx = this.transact(this.createTransaction(address, 1, false, meta));
    if (tx.berr)
        throw tx.error;
    return tx.value & 0xff;
};

Bus.prototype.read16 = function (address, meta) {
    var tx = this.transact(this.createTransaction(address, 2, false, meta));
    if (tx.berr)
        throw tx.error;
    return tx.value & 0xffff;
};

Bus.prototype.read32 = function (address, meta) {
    var tx = this.transact(this.createTransaction(address, 4, false, meta));
    if (tx.berr)
        throw tx.error;
    return tx.value >>> 0;
};

Bus.prototype.write8 = function (address, value, meta) {
    var txMeta = meta || {};
    txMeta.value = value & 0xff;
    var tx = this.transact(this.createTransaction(address, 1, true, txMeta));
    if (tx.berr)
        throw tx.error;
};

Bus.prototype.write16 = function (address, value, meta) {
    var txMeta = meta || {};
    txMeta.value = value & 0xffff;
    var tx = this.transact(this.createTransaction(address, 2, true, txMeta));
    if (tx.berr)
        throw tx.error;
};

Bus.prototype.write32 = function (address, value, meta) {
    var txMeta = meta || {};
    txMeta.value = value >>> 0;
    var tx = this.transact(this.createTransaction(address, 4, true, txMeta));
    if (tx.berr)
        throw tx.error;
};

Bus.prototype.fetch = function (address) {
    return this.read16(address >>> 0);
};

Bus.prototype.reset = function () {
    var devices = uniqueDevices(this.regions);
    for (var i = 0; i < devices.length; ++i) {
        if (typeof devices[i].reset === 'function')
            devices[i].reset();
    }
};

Bus.prototype.advance = function (cycles) {
    var devices = uniqueDevices(this.regions);
    for (var i = 0; i < devices.length; ++i) {
        if (typeof devices[i].advance === 'function')
            devices[i].advance(cycles >>> 0);
        else if (typeof devices[i].tick === 'function')
            devices[i].tick(cycles >>> 0);
    }
};

Bus.prototype.advanceTime = function (seconds) {
    var devices = uniqueDevices(this.regions);
    for (var i = 0; i < devices.length; ++i) {
        if (typeof devices[i].advanceTime === 'function')
            devices[i].advanceTime(seconds);
    }
};

Bus.prototype.getInterruptLevel = function () {
    return this.resolveIpl();
};

module.exports = Bus;
