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
        read8: function (address) {
            var offset = (address - self.start) >>> 0;
            if (offset <= 3) {
                if (self.rx.length === 0)
                    return 0;
                return self.rx.shift() & 0xff;
            }
            if (offset >= 4 && offset <= 7)
                return self.status();
            return 0;
        },
        write8: function (address, value) {
            var offset = (address - self.start) >>> 0;
            if (offset <= 3) {
                self.tx.push(value & 0xff);
                return;
            }
        }
    };
};

Uart.prototype.enqueueRxString = function (text) {
    for (var i = 0; i < text.length; ++i)
        this.rx.push(text.charCodeAt(i) & 0xff);
};

Uart.prototype.txString = function () {
    return Buffer.from(this.tx).toString('latin1');
};

module.exports = Uart;
