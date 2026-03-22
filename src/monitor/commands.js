function hex(value, width) {
    return (Array(width + 1).join('0') + ((value >>> 0).toString(16).toUpperCase())).slice(-width);
}

function parseAddress(text) {
    if (!text)
        throw new Error('missing address');
    return parseInt(text.trim(), 16) >>> 0;
}

function dumpRegisters(machine) {
    var c = machine.cpu.context;
    var lines = [];
    lines.push('D0=' + hex(c.d[0], 8) + ' D1=' + hex(c.d[1], 8) + ' D2=' + hex(c.d[2], 8) + ' D3=' + hex(c.d[3], 8));
    lines.push('D4=' + hex(c.d[4], 8) + ' D5=' + hex(c.d[5], 8) + ' D6=' + hex(c.d[6], 8) + ' D7=' + hex(c.d[7], 8));
    lines.push('A0=' + hex(c.a[0], 8) + ' A1=' + hex(c.a[1], 8) + ' A2=' + hex(c.a[2], 8) + ' A3=' + hex(c.a[3], 8));
    lines.push('A4=' + hex(c.a[4], 8) + ' A5=' + hex(c.a[5], 8) + ' A6=' + hex(c.a[6], 8) + ' A7=' + hex(c.a[7], 8));
    lines.push('PC=' + hex(c.pc, 8) + ' SR=' + hex(c.sr & 0xffff, 4));
    return lines.join('\n');
}

function dumpMemory(machine, address, count) {
    var addr = address >>> 0;
    var bytes = [];
    for (var i = 0; i < count; ++i)
        bytes.push(hex(machine.cpu.context.l8((addr + i) >>> 0), 2));
    return hex(addr, 8) + ': ' + bytes.join(' ');
}

function execute(machine, line) {
    var trimmed = line.trim();
    if (trimmed === '')
        return '';
    if (trimmed.toLowerCase() === 'r')
        return dumpRegisters(machine);
    if (/^m\s+/i.test(trimmed))
        return dumpMemory(machine, parseAddress(trimmed.replace(/^m\s+/i, '')), 16);
    return '?';
}

module.exports = {
    execute: execute,
    hex: hex
};
