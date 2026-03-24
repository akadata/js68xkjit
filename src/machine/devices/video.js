var memoryMap = require('../memory_map');

function Video(options) {
    options = options || {};
    this.start = options.start === undefined ? memoryMap.VIDEO_START : options.start >>> 0;
    this.columns = options.columns === undefined ? 32 : options.columns | 0;
    this.rows = options.rows === undefined ? 4 : options.rows | 0;
    this.size = memoryMap.VIDEO_SIZE;
    this.end = (this.start + this.size - 1) >>> 0;
    this.cursor = 0;
    this.control = 1;
    this.buffer = new Uint8Array(this.columns * this.rows);
    this.reset();
}

Video.prototype.reset = function () {
    this.cursor = 0;
    this.control = 1;
    this.buffer.fill(0x20);
};

Video.prototype.readRegister = function (offset) {
    if (offset < 4) {
        return (this.control >>> ((3 - offset) * 8)) & 0xff;
    }
    if (offset >= 4 && offset < 8) {
        return (this.cursor >>> ((7 - offset) * 8)) & 0xff;
    }
    if (offset >= 8 && offset < 12) {
        return ((this.columns * this.rows) >>> ((11 - offset) * 8)) & 0xff;
    }
    return 0;
};

Video.prototype.writeRegister = function (offset, value) {
    value &= 0xff;
    if (offset < 4) {
        var controlShift = (3 - offset) * 8;
        this.control = ((this.control & ~(0xff << controlShift)) | (value << controlShift)) >>> 0;
        return;
    }
    if (offset >= 4 && offset < 8) {
        var cursorShift = (7 - offset) * 8;
        this.cursor = ((this.cursor & ~(0xff << cursorShift)) | (value << cursorShift)) >>> 0;
        this.cursor %= this.buffer.length;
    }
};

Video.prototype.writeCell = function (offset, value) {
    var index = ((offset - 0x40) >>> 0) % this.buffer.length;
    this.buffer[index] = value & 0xff;
    this.cursor = (index + 1) % this.buffer.length;
};

Video.prototype.text = function () {
    return Buffer.from(this.buffer).toString('latin1');
};

Video.prototype.region = function () {
    var self = this;
    return {
        name: 'video',
        start: self.start,
        end: self.end,
        device: self,
        read8: function (address) {
            var offset = (address - self.start) >>> 0;
            if (offset < 0x40) {
                return self.readRegister(offset);
            }
            if (offset < 0x40 + self.buffer.length) {
                return self.buffer[offset - 0x40] & 0xff;
            }
            return 0;
        },
        write8: function (address, value) {
            var offset = (address - self.start) >>> 0;
            if (offset < 0x40) {
                self.writeRegister(offset, value);
            } else if (offset < 0x40 + self.buffer.length) {
                self.writeCell(offset, value);
            }
        }
    };
};

module.exports = Video;
