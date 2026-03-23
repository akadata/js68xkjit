var memoryMap = require('../memory_map');

function defaultTimingMode() {
    return String(process.env.J68_TIMER_MODE || 'PAL').toUpperCase();
}

function resolveFrameHz(mode) {
    if (mode === 'NTSC')
        return 60;
    return 50;
}

function normalizeWeekday(day) {
    return day === 0 ? 7 : day;
}

function Rtc(options) {
    options = options || {};
    this.start = options.start === undefined ? memoryMap.RTC_START : options.start >>> 0;
    this.end = (this.start + 0xff) >>> 0;
    this.crystalHz = options.crystalHz === undefined ? 32768 : options.crystalHz >>> 0;
    this.mode = String(options.mode || defaultTimingMode()).toUpperCase();
    this.frameHz = options.frameHz === undefined ? resolveFrameHz(this.mode) : options.frameHz >>> 0;
    this.utc = !!options.utc;
    this.nowProvider = typeof options.nowProvider === 'function' ? options.nowProvider : function () {
        return new Date();
    };
}

Rtc.CTRL_UTC = 0x0001;
Rtc.STATUS_PAL = 0x0001;
Rtc.STATUS_NTSC = 0x0002;

Rtc.prototype.reset = function () {
};

Rtc.prototype.region = function () {
    return this;
};

Rtc.prototype.ctrl = function () {
    return this.utc ? Rtc.CTRL_UTC : 0;
};

Rtc.prototype.status = function () {
    return this.mode === 'NTSC' ? Rtc.STATUS_NTSC : Rtc.STATUS_PAL;
};

Rtc.prototype.parts = function () {
    var now = this.nowProvider();
    var year = this.utc ? now.getUTCFullYear() : now.getFullYear();
    var month = (this.utc ? now.getUTCMonth() : now.getMonth()) + 1;
    var day = this.utc ? now.getUTCDate() : now.getDate();
    var hours = this.utc ? now.getUTCHours() : now.getHours();
    var minutes = this.utc ? now.getUTCMinutes() : now.getMinutes();
    var seconds = this.utc ? now.getUTCSeconds() : now.getSeconds();
    var weekday = normalizeWeekday(this.utc ? now.getUTCDay() : now.getDay());
    var millis = this.utc ? now.getUTCMilliseconds() : now.getMilliseconds();
    var subseconds = Math.floor((millis * this.crystalHz) / 1000) >>> 0;
    var unixSeconds = Math.floor(now.getTime() / 1000) >>> 0;

    return {
        year: year >>> 0,
        monthDay: (((month & 0xff) << 8) | (day & 0xff)) >>> 0,
        hourMinute: (((hours & 0xff) << 8) | (minutes & 0xff)) >>> 0,
        secondWeekday: (((seconds & 0xff) << 8) | (weekday & 0xff)) >>> 0,
        subseconds: subseconds & 0xffff,
        crystalHz: this.crystalHz & 0xffff,
        frameHz: this.frameHz & 0xffff,
        ctrl: this.ctrl() & 0xffff,
        status: this.status() & 0xffff,
        unixHi: (unixSeconds >>> 16) & 0xffff,
        unixLo: unixSeconds & 0xffff
    };
};

Rtc.prototype.readWord = function (offset) {
    var parts = this.parts();
    switch (offset & 0xfffe) {
        case 0x00: return 0x5243;
        case 0x02: return parts.ctrl;
        case 0x04: return parts.status;
        case 0x06: return parts.frameHz;
        case 0x08: return parts.crystalHz;
        case 0x0a: return parts.year;
        case 0x0c: return parts.monthDay;
        case 0x0e: return parts.hourMinute;
        case 0x10: return parts.secondWeekday;
        case 0x12: return parts.subseconds;
        case 0x14: return parts.unixHi;
        case 0x16: return parts.unixLo;
    }
    return 0;
};

Rtc.prototype.read8 = function (address) {
    var offset = (address - this.start) >>> 0;
    var word = this.readWord(offset & 0xfffe);
    return (offset & 1) === 0 ? ((word >>> 8) & 0xff) : (word & 0xff);
};

Rtc.prototype.write8 = function (address, value) {
    var offset = (address - this.start) >>> 0;
    value &= 0xff;
    if ((offset & 0xfffe) === 0x02 && (offset & 1) === 1)
        this.utc = (value & Rtc.CTRL_UTC) !== 0;
};

module.exports = Rtc;
