function Intc() {
    this.start = 0x00de0020;
    this.end = 0x00de002f;
    this.pending = 0;
    this.mask = 0x7f;
    this.handlers = {};
}

Intc.prototype.region = function () {
    var self = this;
    return {
        name: 'intc',
        start: self.start,
        end: self.end,
        device: self,
        read8: function (address) {
            var offset = (address - self.start) >>> 0;
            if (offset < 4)
                return (self.pending >>> ((3 - offset) * 8)) & 0xff;
            if (offset < 8)
                return (self.mask >>> ((7 - offset) * 8)) & 0xff;
            return 0;
        },
        write8: function (address, value) {
            var offset = (address - self.start) >>> 0;
            value &= 0xff;
            if (offset >= 4 && offset < 8) {
                var shift = (7 - offset) * 8;
                self.mask = ((self.mask & ~(0xff << shift)) | (value << shift)) >>> 0;
                return;
            }
            if (offset >= 8 && offset < 12) {
                var level = value & 7;
                if (level !== 0)
                    self.acknowledge(level);
            }
        }
    };
};

Intc.prototype.registerSource = function (level, onAck) {
    this.handlers[level & 7] = onAck || null;
};

Intc.prototype.reset = function () {
    this.pending = 0;
    this.mask = 0x7f;
};

Intc.prototype.raise = function (level) {
    if (level < 1 || level > 7)
        throw new RangeError('invalid IRQ level');
    this.pending |= (1 << level);
};

Intc.prototype.acknowledge = function (level) {
    this.pending &= ~(1 << level);
    if (this.handlers[level])
        this.handlers[level]();
};

Intc.prototype.highestPending = function () {
    var active = this.pending & this.mask;
    for (var level = 7; level >= 1; --level) {
        if (active & (1 << level))
            return level;
    }
    return 0;
};

Intc.prototype.getInterruptLevel = function () {
    return this.highestPending();
};

module.exports = Intc;
