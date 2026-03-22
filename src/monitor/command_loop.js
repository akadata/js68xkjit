var commands = require('./commands');

function CommandLoop(machine, uart) {
    this.machine = machine;
    this.uart = uart;
    this.active = false;
    this.buffer = '';
    this.prompt = 'j68> ';
}

CommandLoop.prototype.write = function (text) {
    this.uart.writeString(text);
};

CommandLoop.prototype.enter = function () {
    this.active = true;
    this.buffer = '';
    this.write(this.prompt);
};

CommandLoop.prototype.poll = function () {
    while ((this.uart.status() & 0x02) !== 0) {
        var ch = this.uart.readData();
        if (ch === 0x0d || ch === 0x0a) {
            var response = commands.execute(this.machine, this.buffer);
            this.buffer = '';
            if (response !== '')
                this.write(response + '\n');
            this.write(this.prompt);
            continue;
        }
        if (ch === 0x08 || ch === 0x7f) {
            if (this.buffer.length !== 0)
                this.buffer = this.buffer.slice(0, -1);
            continue;
        }
        this.buffer += String.fromCharCode(ch);
    }
};

module.exports = CommandLoop;
