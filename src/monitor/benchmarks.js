function write32(bytes, offset, value) {
    bytes[offset + 0] = (value >>> 24) & 0xff;
    bytes[offset + 1] = (value >>> 16) & 0xff;
    bytes[offset + 2] = (value >>> 8) & 0xff;
    bytes[offset + 3] = value & 0xff;
}

function write16(bytes, offset, value) {
    bytes[offset + 0] = (value >>> 8) & 0xff;
    bytes[offset + 1] = value & 0xff;
}

var BENCHMARKS = {
    1: {
        name: 'reg-loop',
        baseAddress: 0x00090000,
        dataAddress: 0,
        countOffset: 4,
        dataOffset: -1,
        countWidth: 2,
        loopInstructions: 2,
        image: Uint8Array.from([
            0x70, 0x00, 0x32, 0x3c, 0x03, 0xe7, 0x52, 0x80,
            0x51, 0xc9, 0xff, 0xfc, 0xa0, 0x00
        ])
    },
    2: {
        name: 'mem-write',
        baseAddress: 0x00090100,
        dataAddress: 0x00091000,
        countOffset: 8,
        dataOffset: 2,
        countWidth: 2,
        loopInstructions: 3,
        image: Uint8Array.from([
            0x41, 0xf9, 0x00, 0x09, 0x10, 0x00, 0x32, 0x3c,
            0x03, 0xe7, 0x70, 0x00, 0x20, 0xc0, 0x52, 0x80,
            0x51, 0xc9, 0xff, 0xfa, 0xa0, 0x00
        ])
    },
    3: {
        name: 'mem-read',
        baseAddress: 0x00090200,
        dataAddress: 0x00091000,
        countOffset: 8,
        dataOffset: 2,
        countWidth: 2,
        loopInstructions: 3,
        image: Uint8Array.from([
            0x41, 0xf9, 0x00, 0x09, 0x10, 0x00, 0x32, 0x3c,
            0x03, 0xe7, 0x70, 0x00, 0x24, 0x10, 0xd0, 0x82,
            0x51, 0xc9, 0xff, 0xfa, 0xa0, 0x00
        ])
    }
};

function prepare(id, count) {
    var definition = BENCHMARKS[id];
    if (!definition) {
        return null;
    }
    var image = new Uint8Array(definition.image);
    if (definition.countWidth === 2) {
        write16(image, definition.countOffset, ((count - 1) & 0xffff) >>> 0);
    }  else {
        write32(image, definition.countOffset, count >>> 0);
    }
    if (definition.dataOffset >= 0) {
        write32(image, definition.dataOffset, definition.dataAddress >>> 0);
    }
    return {
        id: id,
        name: definition.name,
        baseAddress: definition.baseAddress >>> 0,
        dataAddress: definition.dataAddress >>> 0,
        loopInstructions: definition.loopInstructions >>> 0,
        image: image
    };
}

module.exports = {
    prepare: prepare
};