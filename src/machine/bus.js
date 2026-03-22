function rangeContains(start, end, address, size) {
    var last = (address + size - 1) >>> 0;
    return address >= start && last <= end;
}

function createMemoryRegion(name, start, size, bytes, writable) {
    if (!(bytes instanceof Uint8Array))
        throw new TypeError(name + ' bytes must be a Uint8Array');
    if (bytes.length !== size)
        throw new RangeError(name + ' size mismatch');

    var end = (start + size - 1) >>> 0;
    return {
        name: name,
        start: start >>> 0,
        end: end,
        read8: function (address) {
            return bytes[(address - start) >>> 0];
        },
        write8: function (address, value) {
            if (!writable)
                throw new RangeError(name + ' is read-only at $' + address.toString(16));
            bytes[(address - start) >>> 0] = value & 0xff;
        },
        bytes: bytes
    };
}

function Bus() {
    this.regions = [];
}

Bus.createMemoryRegion = createMemoryRegion;

Bus.prototype.map = function (region) {
    if (!region || typeof region.start !== 'number' || typeof region.end !== 'number')
        throw new TypeError('invalid region');
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

Bus.prototype.regionFor = function (address, size) {
    for (var i = 0; i < this.regions.length; ++i) {
        var region = this.regions[i];
        if (rangeContains(region.start, region.end, address, size))
            return region;
    }
    throw new RangeError('unmapped bus access at $' + (address >>> 0).toString(16));
};

Bus.prototype.read8 = function (address) {
    var region = this.regionFor(address >>> 0, 1);
    if (typeof region.read8 !== 'function')
        throw new RangeError(region.name + ' does not support byte reads');
    return region.read8(address >>> 0) & 0xff;
};

Bus.prototype.read16 = function (address) {
    address >>>= 0;
    return ((this.read8(address) << 8) | this.read8(address + 1)) >>> 0;
};

Bus.prototype.read32 = function (address) {
    address >>>= 0;
    return (((this.read16(address) << 16) >>> 0) | this.read16(address + 2)) >>> 0;
};

Bus.prototype.write8 = function (address, value) {
    var region = this.regionFor(address >>> 0, 1);
    if (typeof region.write8 !== 'function')
        throw new RangeError(region.name + ' does not support byte writes');
    region.write8(address >>> 0, value & 0xff);
};

Bus.prototype.write16 = function (address, value) {
    address >>>= 0;
    value >>>= 0;
    this.write8(address, (value >>> 8) & 0xff);
    this.write8(address + 1, value & 0xff);
};

Bus.prototype.write32 = function (address, value) {
    address >>>= 0;
    value >>>= 0;
    this.write16(address, (value >>> 16) & 0xffff);
    this.write16(address + 2, value & 0xffff);
};

Bus.prototype.fetch = function (address) {
    return this.read16(address >>> 0);
};

module.exports = Bus;
