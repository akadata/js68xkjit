var memoryMap = require('../memory_map');

function Timer(options) {
    options = options || {};
    this.start = options.start === undefined ? memoryMap.TIMER_START : options.start >>> 0;
    this.end = (this.start + memoryMap.TIMER_SIZE - 1) >>> 0;
    this.intc = options.intc || null;
    this.irqLevel = options.irqLevel === undefined ? 2 : options.irqLevel | 0;
    this.baseHz = options.baseHz === undefined ? 1000000 : options.baseHz >>> 0;
    this.defaultReload = options.defaultReload === undefined ? 1000 : options.defaultReload >>> 0;
    this.count = this.defaultReload >>> 0;
    this.reload = this.defaultReload >>> 0;
    this.control = 0;
    this.pending = false;
}

Timer.CONTROL_ENABLE = 0x01;
Timer.CONTROL_AUTORELOAD = 0x02;
Timer.CONTROL_IRQ_ENABLE = 0x04;
Timer.STATUS_PENDING = 0x01;
Timer.STATUS_RUNNING = 0x02;

Timer.prototype.attachIntc = function (intc) {
    this.intc = intc;
};

Timer.prototype.region = function () {
    var self = this;
    return {
        name: 'timer',
        start: self.start,
        end: self.end,
        read8: function (address) {
            var offset = (address - self.start) >>> 0;
            if (offset < 4)
                return (self.count >>> ((3 - offset) * 8)) & 0xff;
            if (offset < 8)
                return (self.reload >>> ((7 - offset) * 8)) & 0xff;
            if (offset < 12)
                return offset === 11 ? self.control & 0xff : 0;
            if (offset < 16)
                return offset === 15 ? self.status() & 0xff : 0;
            return 0;
        },
        write8: function (address, value) {
            var offset = (address - self.start) >>> 0;
            value &= 0xff;
            if (offset < 4) {
                self.count = self.writeByte(self.count, offset, value);
                return;
            }
            if (offset < 8) {
                self.reload = self.writeByte(self.reload, offset - 4, value);
                return;
            }
            if (offset < 12) {
                if (offset === 11) {
                    self.control = value & 0xff;
                    if ((self.control & Timer.CONTROL_ENABLE) !== 0 && self.count === 0)
                        self.count = self.reload >>> 0;
                }
                return;
            }
            if (offset < 16 && offset === 15 && (value & Timer.STATUS_PENDING) !== 0)
                self.clearPending();
        }
    };
};

Timer.prototype.writeByte = function (current, byteIndex, value) {
    var shift = (3 - byteIndex) * 8;
    return ((current & ~(0xff << shift)) | (value << shift)) >>> 0;
};

Timer.prototype.status = function () {
    var status = 0;
    if (this.pending)
        status |= Timer.STATUS_PENDING;
    if ((this.control & Timer.CONTROL_ENABLE) !== 0)
        status |= Timer.STATUS_RUNNING;
    return status;
};

Timer.prototype.clearPending = function () {
    this.pending = false;
};

Timer.prototype.raiseInterrupt = function () {
    this.pending = true;
    if (this.intc && (this.control & Timer.CONTROL_IRQ_ENABLE) !== 0)
        this.intc.raise(this.irqLevel);
};

Timer.prototype.acknowledge = function () {
    this.clearPending();
};

Timer.prototype.advance = function (ticks) {
    ticks >>>= 0;
    if ((this.control & Timer.CONTROL_ENABLE) === 0 || ticks === 0)
        return;

    while (ticks !== 0) {
        if (this.count === 0)
            this.count = this.reload >>> 0;
        var step = ticks < this.count ? ticks : this.count;
        this.count = (this.count - step) >>> 0;
        ticks = (ticks - step) >>> 0;
        if (this.count === 0) {
            this.raiseInterrupt();
            if ((this.control & Timer.CONTROL_AUTORELOAD) === 0) {
                this.control &= ~Timer.CONTROL_ENABLE;
                break;
            }
            this.count = this.reload >>> 0;
        }
    }
};

module.exports = Timer;
