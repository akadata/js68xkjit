var errors = require('./errors');

function createMemoryRegion(name, start, size, bytes, writable, options) {
    var base = start >>> 0;
    var opts = options || {};

    if (!(bytes instanceof Uint8Array))
        throw new TypeError(name + ' bytes must be a Uint8Array');
    if (bytes.length !== size)
        throw new RangeError(name + ' size mismatch');

    function offset(address) {
        return ((address >>> 0) - base) >>> 0;
    }

    return {
        name: name,
        start: base,
        end: (base + size - 1) >>> 0,
        bytes: bytes,
        writable: !!writable,
        device: opts.device || null,
        read8: function (address) {
            return bytes[offset(address)] & 0xff;
        },
        read16: function (address) {
            var index = offset(address);
            return (((bytes[index] << 8) | bytes[index + 1]) & 0xffff) >>> 0;
        },
        read32: function (address) {
            var index = offset(address);
            return ((((bytes[index] << 24) >>> 0) |
                (bytes[index + 1] << 16) |
                (bytes[index + 2] << 8) |
                bytes[index + 3]) >>> 0);
        },
        write8: function (address, value) {
            if (!writable)
                throw new errors.ReadOnlyError(name, address);
            bytes[offset(address)] = value & 0xff;
        },
        write16: function (address, value) {
            if (!writable)
                throw new errors.ReadOnlyError(name, address);
            var index = offset(address);
            bytes[index] = (value >>> 8) & 0xff;
            bytes[index + 1] = value & 0xff;
        },
        write32: function (address, value) {
            if (!writable)
                throw new errors.ReadOnlyError(name, address);
            var index = offset(address);
            bytes[index] = (value >>> 24) & 0xff;
            bytes[index + 1] = (value >>> 16) & 0xff;
            bytes[index + 2] = (value >>> 8) & 0xff;
            bytes[index + 3] = value & 0xff;
        }
    };
}

module.exports = createMemoryRegion;
