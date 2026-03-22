var memoryMap = require('../memory_map');

function Uart(options) {
    options = options || {};
    this.start = options.start === undefined ? memoryMap.UART_START : options.start >>> 0;
    this.end = (this.start + memoryMap.UART_SIZE - 1) >>> 0;
    this.tx = [];
    this.rx = [];
}

Uart.STATUS_TX_READY = 0x01;
Uart.STATUS_RX_READY = 0x02;

Uart.prototype.status = function () {
    var status = Uart.STATUS_TX_READY;
    if (this.rx.length !== 0)
        status |= Uart.STATUS_RX_READY;
    return status;
};

Uart.prototype.region = function () {
    var self = this;
    return {
        name: 'uart',
        start: this.start,
        end: this.end,
        device: self,
        read8: function (address) {
            var offset = (address - self.start) >>> 0;
            if (offset <= 3) {
                return self.readData();
            }
            if (offset >= 4 && offset <= 7)
                return self.status();
            return 0;
        },
        write8: function (address, value) {
            var offset = (address - self.start) >>> 0;
            if (offset <= 3)
                self.writeData(value);
        }
    };
};

Uart.prototype.readData = function () {
    if (this.rx.length === 0)
        return 0;
    return this.rx.shift() & 0xff;
};

Uart.prototype.writeData = function (value) {
    this.tx.push(value & 0xff);
};

Uart.prototype.enqueueRxString = function (text) {
    for (var i = 0; i < text.length; ++i)
        this.rx.push(text.charCodeAt(i) & 0xff);
};

Uart.prototype.writeString = function (text) {
    for (var i = 0; i < text.length; ++i)
        this.writeData(text.charCodeAt(i));
};

Uart.prototype.reset = function () {
    this.tx = [];
    this.rx = [];
};

Uart.prototype.txString = function () {
    return Buffer.from(this.tx).toString('latin1');
};

Uart.prototype.consumeTxString = function () {
    var text = this.txString();
    this.tx = [];
    return text;
};

module.exports = Uart;
