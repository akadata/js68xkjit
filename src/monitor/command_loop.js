var commands = require('./commands');

function CommandLoop(machine, uart) {
    this.machine = machine;
    this.uart = uart;
    this.active = false;
    this.buffer = '';
    this.mode = null;
    this.prompt = 'j68> ';
}

CommandLoop.prototype.write = function (text) {
    this.uart.writeString(text);
};

CommandLoop.prototype.enter = function (suppressPrompt) {
    this.active = true;
    this.buffer = '';
    this.mode = null;
    if (!suppressPrompt)
        this.write(this.prompt);
};

CommandLoop.prototype.poll = function () {
    while ((this.uart.status() & 0x02) !== 0) {
        var ch = this.uart.readData();
        if (ch === 0x0d || ch === 0x0a) {
            var line = this.buffer;
            var response;
            var output;
            var suppressPrompt = false;
            this.buffer = '';
            this.write('\r\n');
            try {
                response = this.mode && typeof this.mode.handle === 'function'
                    ? this.mode.handle(line)
                    : commands.execute(this.machine, line);
            } catch (error) {
                this.mode = null;
                response = {
                    output: process.env.J68_MONITOR_DEBUG === '1' ? 'ERR internal: ' + error.message : 'ERR internal'
                };
            }
            output = response;
            if (response && typeof response === 'object') {
                output = response.output || '';
                suppressPrompt = !!response.suppressPrompt;
                if (response.exitMode) {
                    this.mode = null;
                }
                if (response.mode) {
                    this.mode = response.mode;
                }
            }
            if (output !== '') {
                this.write(output + '\r\n');
            }
            if (!this.active) {
                return;
            }
            if (this.mode && typeof this.mode.prompt === 'function') {
                this.write(this.mode.prompt());
            } else if (!suppressPrompt) {
                this.write(this.prompt);
            }
            continue;
        }
        if (ch === 0x08 || ch === 0x7f) {
            if (this.buffer.length !== 0) {
                this.buffer = this.buffer.slice(0, -1);
                this.write('\b \b');
            }
            continue;
        }
        this.buffer += String.fromCharCode(ch);
        this.write(String.fromCharCode(ch));
    }
};

module.exports = CommandLoop;