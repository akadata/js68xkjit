var fs = require('fs');
var path = require('path');
var assembler = require('./assembler');
var disassembler = require('./disassembler');
var benchmarks = require('./benchmarks');
var saveRoot = path.resolve(__dirname, '../../save');
var sourceRoot = path.resolve(__dirname, '../../source');

function hex(value, width) {
    return (Array(width + 1).join('0') + ((value >>> 0).toString(16).toUpperCase())).slice(-width);
}

function formatFault(machine) {
    var fault = machine.lastFault;
    if (!fault)
        return 'ERR internal';
    return [
        'FAULT PC=' + hex(fault.pc, 8) + ' OP=' + hex(fault.op, 4),
        'SR=' + hex(fault.sr, 4) +
        ' D0=' + hex(fault.d0, 8) +
        ' D1=' + hex(fault.d1, 8) +
        ' A0=' + hex(fault.a0, 8) +
        ' A1=' + hex(fault.a1, 8)
    ].join('\n');
}

function parseAddress(text) {
    if (!text || text.trim() === '')
        throw new Error('missing address');
    if (!/^(\$[0-9a-f]+|(0x)?[0-9a-f]+)$/i.test(text.trim()))
        throw new Error('invalid address: ' + text.trim());
    if (/^\$/i.test(text.trim()))
        return parseInt(text.trim().slice(1), 16) >>> 0;
    return parseInt(text.trim(), 16) >>> 0;
}

function parseNumber(text) {
    if (!text || text.trim() === '')
        throw new Error('missing number');
    if (!/^(\$[0-9a-f]+|(0x)?[0-9a-f]+)$/i.test(text.trim()))
        throw new Error('invalid number: ' + text.trim());
    if (/^\$/i.test(text.trim()))
        return parseInt(text.trim().slice(1), 16) >>> 0;
    return parseInt(text.trim(), 16) >>> 0;
}

function parseDataTokens(text) {
    var parts = text.trim().split(/[\s,]+/).filter(Boolean);
    var bytes = [];
    for (var i = 0; i < parts.length; ++i) {
        var token = parts[i].replace(/^0x/i, '');
        if (!/^[0-9a-f]+$/i.test(token))
            throw new Error('invalid data token: ' + parts[i]);
        if (token.length <= 2) {
            bytes.push(parseInt(token, 16) & 0xff);
            continue;
        }
        if (token.length <= 4) {
            var word = parseInt(token, 16) & 0xffff;
            bytes.push((word >>> 8) & 0xff, word & 0xff);
            continue;
        }
        if (token.length <= 8) {
            var longword = parseInt(token, 16) >>> 0;
            bytes.push((longword >>> 24) & 0xff, (longword >>> 16) & 0xff, (longword >>> 8) & 0xff, longword & 0xff);
            continue;
        }
        throw new Error('data token too wide: ' + parts[i]);
    }
    return bytes;
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

function setRegister(machine, assignment) {
    var match = /^\s*([ad][0-7]|pc|sr|ssp|usp|vbr)\s*=\s*([0-9a-f]+)\s*$/i.exec(assignment);
    var c = machine.cpu.context;
    var name;
    var value;

    if (!match)
        throw new Error('invalid register assignment');
    name = match[1].toLowerCase();
    value = parseNumber(match[2]);

    if (name === 'pc')
        c.pc = value >>> 0;
    else if (name === 'sr')
        c.setSr(value & 0xffff);
    else if (name === 'ssp') {
        c.ssp = value >>> 0;
        if ((c.sr & 0x2000) !== 0)
            c.a[7] = value >>> 0;
    } else if (name === 'usp') {
        c.usp = value >>> 0;
        if ((c.sr & 0x2000) === 0)
            c.a[7] = value >>> 0;
    } else if (name === 'vbr')
        c.vbr = value >>> 0;
    else if (name.charAt(0) === 'd')
        c.d[parseInt(name.charAt(1), 10)] = value >>> 0;
    else {
        c.a[parseInt(name.charAt(1), 10)] = value >>> 0;
        if (name === 'a7') {
            if ((c.sr & 0x2000) !== 0)
                c.ssp = value >>> 0;
            else
                c.usp = value >>> 0;
        }
    }

    return dumpRegisters(machine);
}

function dumpMemory(machine, address, count) {
    var addr = address >>> 0;
    var bytes = [];
    for (var i = 0; i < count; ++i)
        bytes.push(hex(machine.cpu.context.l8((addr + i) >>> 0), 2));
    return hex(addr, 8) + ': ' + bytes.join(' ');
}

function patchMemory(machine, address, dataText) {
    var bytes = parseDataTokens(dataText);
    var addr = address >>> 0;
    for (var i = 0; i < bytes.length; ++i)
        machine.write8(addr + i, bytes[i]);
    return dumpMemory(machine, addr, Math.max(16, bytes.length));
}

function dumpInterruptState(machine) {
    var timer = machine.primaryTimer();
    var intc = machine.intc;
    if (!timer || !intc)
        return 'NO TIMER';
    return [
        'TICKS=' + hex(timer.ticks, 8) +
        ' COUNT=' + hex(timer.count, 8) +
        ' RELOAD=' + hex(timer.reload, 8),
        'CTRL=' + hex(timer.control, 2) +
        ' STATUS=' + hex(timer.status(), 2) +
        ' PENDING=' + hex(intc.pending, 8) +
        ' MASK=' + hex(intc.mask, 8)
    ].join('\n');
}

function configureTimerReload(machine, valueText) {
    var timer = machine.primaryTimer();
    if (!timer)
        return 'NO TIMER';
    var reload = parseAddress(valueText);
    timer.reload = reload >>> 0;
    timer.count = reload >>> 0;
    return 'RELOAD=' + hex(timer.reload, 8) + ' COUNT=' + hex(timer.count, 8);
}

function configureTimerEnable(machine, valueText) {
    var timer = machine.primaryTimer();
    if (!timer)
        return 'NO TIMER';
    var enabled = parseInt(valueText.trim(), 10);
    if (enabled !== 0 && enabled !== 1)
        throw new Error('invalid timer enable value');
    if (enabled)
        timer.control |= 0x01;
    else
        timer.control &= ~0x01;
    return 'CTRL=' + hex(timer.control, 2) + ' STATUS=' + hex(timer.status(), 2);
}

function configureInterruptMask(machine, valueText) {
    if (!machine.intc)
        return 'NO INTC';
    machine.intc.mask = parseAddress(valueText) >>> 0;
    return 'MASK=' + hex(machine.intc.mask, 8);
}

function formatMips(actualInstructions, elapsedUs) {
    if (elapsedUs <= 0)
        return '0.00';
    return ((actualInstructions / elapsedUs)).toFixed(2);
}


function readFixed16Value(machine, text) {
    var token = String(text || '').trim().toLowerCase();
    var c = machine.cpu.context;
    if (/^[da][0-7]$/.test(token))
        return c[token.charAt(0) === 'd' ? 'd' : 'a'][parseInt(token.charAt(1), 10)] >>> 0;
    if (token === 'pc')
        return c.pc >>> 0;
    if (token === 'sr')
        return c.sr & 0xffff;
    return parseNumber(text);
}

function formatFixed16(machine, text) {
    if (!text || text.trim() === '')
        throw new Error('usage: fx <reg|value>');
    var token = text.trim();
    var value = readFixed16Value(machine, token) >>> 0;
    var signed = value | 0;
    var negative = signed < 0;
    var abs = negative ? (-signed) >>> 0 : value;
    var integerPart = abs >>> 16;
    var fractional = abs & 0xffff;
    var scaled = Math.floor((fractional * 100000 + 32768) / 65536);
    if (scaled >= 100000) {
        integerPart += 1;
        scaled -= 100000;
    }
    return token.toUpperCase() + ' = ' + hex(value, 8) + ' = ' + (negative ? '-' : '') + integerPart + '.' + String(scaled).padStart(5, '0') + ' (16.16)';
}

function runBenchmark(machine, valueText) {
    var parts = valueText.trim().split(/\s+/).filter(Boolean);
    var id = parseInt(parts[0], 10);
    if (!(id >= 1 && id <= 3))
        throw new Error('invalid benchmark id');
    var count = parts.length > 1 ? parseInt(parts[1], 10) >>> 0 : 50000;
    if (count === 0 || count > 0x10000)
        throw new Error('invalid benchmark count');

    var bench = benchmarks.prepare(id, count);
    machine.loadChipRamBytes(bench.baseAddress, bench.image);

    if (bench.dataAddress) {
        var data = new Uint8Array(Math.min(count * 4, 4096));
        for (var i = 0; i < data.length; ++i)
            data[i] = (i & 3) === 3 ? 1 : 0;
        machine.loadChipRamBytes(bench.dataAddress, data);
    }

    var timer = machine.primaryTimer();
    var beforeTicks = timer ? timer.ticks >>> 0 : 0;
    var beforeInstructions = machine.cpu.context.i >>> 0;
    var previousPc = machine.cpu.context.pc >>> 0;
    var previousHalt = machine.cpu.context.halt;
    var previousTrapHandler = machine.monitorTrapHandler;
    machine.cpu.context.pc = bench.baseAddress >>> 0;
    machine.cpu.context.halt = false;
    if (machine.monitor)
        machine.monitor.active = false;

    machine.monitorTrapHandler = function (inst) {
        if (inst !== 0xa000)
            return false;
        machine.cpu.context.halt = true;
        return true;
    };

    var start = process.hrtime.bigint();
    var halted = machine.runUntil(function (m) {
        return m.cpu.context.halt;
    }, Math.max(1000, count * 4));
    var elapsedUs = Number((process.hrtime.bigint() - start) / 1000n);

    machine.monitorTrapHandler = previousTrapHandler;
    if (machine.monitor)
        machine.monitor.active = true;

    if (!halted) {
        machine.cpu.context.halt = true;
        return 'BENCH' + id + ' RUN LIMIT';
    }

    var estimatedInstructions = (count * bench.loopInstructions) >>> 0;
    var actualInstructions = (machine.cpu.context.i - beforeInstructions) >>> 0;
    var virtualTicks = timer ? ((timer.ticks - beforeTicks) >>> 0) : 0;

    machine.cpu.context.pc = previousPc >>> 0;
    machine.cpu.context.halt = previousHalt;

    return [
        'BENCH' + id + ' ' + bench.name.toUpperCase() +
        ' COUNT=' + count +
        ' HOST_US=' + elapsedUs +
        ' VIRT_TICKS=' + virtualTicks,
        'EST_INS=' + estimatedInstructions +
        ' ACT_INS=' + actualInstructions +
        ' APPROX_MIPS=' + formatMips(actualInstructions, elapsedUs)
    ].join('\n');
}

function ensureSaveRoot() {
    fs.mkdirSync(saveRoot, { recursive: true });
}

function ensureSourceRoot() {
    fs.mkdirSync(sourceRoot, { recursive: true });
}

function visibleEntries(root, matcher) {
    return fs.readdirSync(root)
        .filter(function (name) {
            if (!name || name.charAt(0) === '.')
                return false;
            return !matcher || matcher(name);
        })
        .sort();
}

function isPrintableByte(value) {
    return value >= 0x20 && value <= 0x7e && value !== 0x27;
}

function formatDcBItems(bytes) {
    var items = [];
    var i = 0;
    while (i < bytes.length) {
        if (isPrintableByte(bytes[i])) {
            var start = i;
            while (i < bytes.length && isPrintableByte(bytes[i]))
                i += 1;
            if ((i - start) >= 2) {
                items.push("'" + Buffer.from(bytes.slice(start, i)).toString('latin1') + "'");
                continue;
            }
            i = start;
        }
        items.push('$' + hex(bytes[i], 2).toLowerCase());
        i += 1;
    }
    return items.join(',');
}

function emitDataAsDcB(machine, start, end, lines) {
    var addr = start >>> 0;
    while (addr < end) {
        var chunk = [];
        var count = Math.min(16, (end - addr) >>> 0);
        for (var i = 0; i < count; ++i)
            chunk.push(machine.read8(addr + i));
        lines.push('dc.b ' + formatDcBItems(chunk));
        addr = (addr + count) >>> 0;
    }
}

function saveMemory(machine, valueText) {
    var parts = valueText.trim().split(/\s+/).filter(Boolean);
    var address;
    var length;
    var filename;
    var output = [];

    if (parts.length < 3)
        throw new Error('usage: save <addr> <len> <name>');
    address = parseAddress(parts[0]);
    length = parseNumber(parts[1]);
    filename = path.basename(parts[2]);
    ensureSaveRoot();
    for (var i = 0; i < length; ++i)
        output.push(machine.read8(address + i));
    fs.writeFileSync(path.join(saveRoot, filename), Buffer.from(output));
    return 'SAVED ' + length + ' ' + filename;
}

function loadMemory(machine, valueText) {
    var parts = valueText.trim().split(/\s+/).filter(Boolean);
    var address;
    var filename;
    var filePath;
    var bytes;

    if (parts.length < 2)
        throw new Error('usage: load <addr> <name>');
    address = parseAddress(parts[0]);
    filename = path.basename(parts[1]);
    if (/\.(asm|s|x68)$/i.test(filename))
        throw new Error('assembly source loads with loadasm from source/; use source or loadasm <addr> <name>');
    filePath = path.join(saveRoot, filename);
    bytes = fs.readFileSync(filePath);
    for (var i = 0; i < bytes.length; ++i)
        machine.write8(address + i, bytes[i]);
    return 'LOADED ' + bytes.length + ' ' + filename;
}

function saveAsm(machine, valueText) {
    var parts = valueText.trim().split(/\s+/).filter(Boolean);
    var address;
    var length;
    var filename;
    var filePath;
    var pc;
    var end;
    var lines = [];
    var dataMode = false;

    if (parts.length < 3)
        throw new Error('usage: saveasm <addr> <len> <name>');
    ensureSourceRoot();
    address = parseAddress(parts[0]);
    length = parseNumber(parts[1]);
    filename = path.basename(parts[2]);
    filePath = path.join(sourceRoot, filename);
    pc = address >>> 0;
    end = (address + length) >>> 0;

    lines.push('a ' + hex(address, 8));
    while (pc < end) {
        if (dataMode) {
            emitDataAsDcB(machine, pc, end, lines);
            break;
        }
        var remaining = (end - pc) >>> 0;
        var decoded = disassembler.disassembleOne(machine, pc);
        if (decoded.text.indexOf('DC.W ') === 0) {
            if (remaining >= 2) {
                lines.push('dc.w ' + decoded.text.slice(5).trim().toLowerCase());
                pc = (pc + 2) >>> 0;
                continue;
            }
            lines.push('dc.b $' + hex(machine.read8(pc), 2).toLowerCase());
            pc = (pc + 1) >>> 0;
            continue;
        }
        if (decoded.next > end) {
            while (pc < end) {
                lines.push('dc.b $' + hex(machine.read8(pc), 2).toLowerCase());
                pc = (pc + 1) >>> 0;
            }
            break;
        }
        lines.push(decoded.text.toLowerCase());
        pc = decoded.next >>> 0;
        if (decoded.text === 'MONITOR' || decoded.text === 'RTS' || decoded.text === 'RTE')
            dataMode = true;
    }
    lines.push('');
    fs.writeFileSync(filePath, lines.join('\n'));
    return 'SAVED ASM ' + length + ' ' + filename;
}

function loadAsm(machine, valueText) {
    var parts = valueText.trim().split(/\s+/).filter(Boolean);
    var address;
    var filename;
    if (parts.length < 2)
        throw new Error('usage: loadasm <addr> <name>');
    ensureSourceRoot();
    address = parseAddress(parts[0]);
    filename = path.basename(parts[1]);
    return loadAsmFile(machine, address, filename, path.join(sourceRoot, filename));
}

function listSaveFiles() {
    ensureSaveRoot();
    var entries = visibleEntries(saveRoot);
    if (entries.length === 0)
        return 'SAVE EMPTY';
    return entries.join('\n');
}

function loadAsmFile(machine, address, filename, filePath) {
    var source = fs.readFileSync(filePath, 'utf8');
    var assembled = assembler.assembleText(address >>> 0, source);
    var i;

    for (i = 0; i < assembled.bytes.length; ++i)
        machine.write8(assembled.address + i, assembled.bytes[i]);

    return 'LOADED ASM ' + assembled.length + ' ' + filename + ' END=' + hex((assembled.address + assembled.length) >>> 0, 8);
}

function sourceCommand(machine, valueText) {
    ensureSourceRoot();
    var trimmed = String(valueText || '').trim();
    var entries;

    if (trimmed !== '')
        throw new Error('usage: source');
    entries = visibleEntries(sourceRoot, function (name) {
        return /\.(s|asm|x68)$/i.test(name);
    });
    if (entries.length === 0)
        return 'SOURCE EMPTY';
    return entries.join('\n');
}

function resetMachine(machine) {
    machine.clearFault();
    machine.cpu.context.halt = false;
    if (machine.monitor)
        machine.monitor.active = false;
    machine.reset();
    machine.runBlocks(1);
    return { output: '', suppressPrompt: true };
}

function startAssembler(machine, valueText) {
    return {
        output: '',
        suppressPrompt: true,
        mode: assembler.createSession(machine, parseAddress(valueText), { hex: hex })
    };
}

function runProgram(machine, valueText, budget) {
    var target = parseAddress(valueText);
    var limit = budget === undefined ? 50000 : budget | 0;
    var beforeInstructions = machine.cpu.context.i >>> 0;
    machine.clearFault();
    machine.cpu.context.pc = target >>> 0;
    machine.cpu.context.halt = false;
    machine.monitorSuppressEnterPrompt = true;
    if (machine.monitor)
        machine.monitor.active = false;

    var halted = machine.runUntilInstruction(function (m) {
        return m.cpu.context.halt;
    }, limit);
    var executedInstructions = (machine.cpu.context.i - beforeInstructions) >>> 0;

    if (machine.lastFault) {
        machine.monitorSuppressEnterPrompt = false;
        if (machine.monitor)
            machine.monitor.active = true;
        return formatFault(machine);
    }

    if (machine.monitor && machine.monitor.active)
        return '';

    if (!halted) {
        machine.cpu.context.halt = true;
        machine.monitorSuppressEnterPrompt = false;
        if (machine.monitor)
            machine.monitor.active = true;
        return 'RUN LIMIT PC=' + hex(machine.cpu.context.pc, 8) + ' INS=' + executedInstructions;
    }
    machine.monitorSuppressEnterPrompt = false;
    if (machine.monitor)
        machine.monitor.active = true;
    return 'STOP PC=' + hex(machine.cpu.context.pc, 8) + ' INS=' + executedInstructions;
}

function stepProgram(machine, valueText) {
    machine.clearFault();
    if (valueText && valueText.trim() !== '')
        machine.cpu.context.pc = parseAddress(valueText);
    machine.cpu.context.halt = false;
    var decoded = machine.stepInstruction();
    if (machine.lastFault)
        return formatFault(machine);
    if (!decoded)
        return 'HALT';
    var next = disassembler.disassembleOne(machine, machine.cpu.context.pc >>> 0);
    return 'PC=' + hex(machine.cpu.context.pc, 8) + '\n' + hex(machine.cpu.context.pc, 8) + ': ' + next.text;
}

function execute(machine, line) {
    try {
        var trimmed = line.trim();
        if (trimmed === '')
            return '';
        if (trimmed === '?' || trimmed.toLowerCase() === 'h' || trimmed.toLowerCase() === 'help')
            return [
                'r [reg=value]  registers',
                'm <addr>       dump memory',
                'm <addr>=...   patch memory',
                'u <addr>       disassemble',
                'a <addr>       assemble',
                'g <addr>       run',
                'gl <addr>      long run',
                't [addr]       single-step',
                'save <addr> <len> <name>',
                'saveasm <addr> <len> <name>',
                'load <addr> <name>',
                'loadasm <addr> <name>',
                'source          list source/ files',
                'list            list save/ files',
                'reset          reboot monitor',
                'i ti te tm     timer and irq',
                'fx <reg|value> show 16.16 fixed-point value',
                'numbers: monitor addrs/data/len are hex',
                'a immediates: plain decimal, $/0x hex'
            ].join('\n');
        if (trimmed.toLowerCase() === 'r')
            return dumpRegisters(machine);
        if (/^r\s+/i.test(trimmed))
            return setRegister(machine, trimmed.replace(/^r\s+/i, ''));
        if (trimmed.toLowerCase() === 'i')
            return dumpInterruptState(machine);
        if (/^m\s+[0-9a-f]+\s*=/i.test(trimmed)) {
            var assign = trimmed.replace(/^m\s+/i, '');
            var parts = assign.split('=');
            return patchMemory(machine, parseAddress(parts[0]), parts.slice(1).join('='));
        }
        if (/^m\s+/i.test(trimmed))
            return dumpMemory(machine, parseAddress(trimmed.replace(/^m\s+/i, '')), 16);
        if (/^u\s+/i.test(trimmed))
            return disassembler.disassemble(machine, parseAddress(trimmed.replace(/^u\s+/i, '')), 5);
        if (/^a\s+/i.test(trimmed))
            return startAssembler(machine, trimmed.replace(/^a\s+/i, ''));
        if (/^save\s+/i.test(trimmed))
            return saveMemory(machine, trimmed.replace(/^save\s+/i, ''));
        if (/^saveasm\s+/i.test(trimmed))
            return saveAsm(machine, trimmed.replace(/^saveasm\s+/i, ''));
        if (/^load\s+/i.test(trimmed))
            return loadMemory(machine, trimmed.replace(/^load\s+/i, ''));
        if (/^loadasm\s+/i.test(trimmed))
            return loadAsm(machine, trimmed.replace(/^loadasm\s+/i, ''));
        if (/^source(\s+.*)?$/i.test(trimmed))
            return sourceCommand(machine, trimmed.replace(/^source\s*/i, ''));
        if (trimmed.toLowerCase() === 'list')
            return listSaveFiles();
        if (trimmed.toLowerCase() === 'reset')
            return resetMachine(machine);
        if (/^bench\s+/i.test(trimmed))
            return runBenchmark(machine, trimmed.replace(/^bench\s+/i, ''));
        if (/^gl\s+/i.test(trimmed))
            return runProgram(machine, trimmed.replace(/^gl\s+/i, ''), 500000);
        if (/^g\s+/i.test(trimmed))
            return runProgram(machine, trimmed.replace(/^g\s+/i, ''));
        if (trimmed.toLowerCase() === 't')
            return stepProgram(machine, '');
        if (/^t\s+/i.test(trimmed))
            return stepProgram(machine, trimmed.replace(/^t\s+/i, ''));
        if (/^ti\s+/i.test(trimmed))
            return configureTimerReload(machine, trimmed.replace(/^ti\s+/i, ''));
        if (/^te\s+/i.test(trimmed))
            return configureTimerEnable(machine, trimmed.replace(/^te\s+/i, ''));
        if (/^tm\s+/i.test(trimmed))
            return configureInterruptMask(machine, trimmed.replace(/^tm\s+/i, ''));
        if (/^fx\s+/i.test(trimmed))
            return formatFixed16(machine, trimmed.replace(/^fx\s+/i, ''));
        return 'ERR unknown command';
    } catch (error) {
        return 'ERR ' + error.message;
    }
}

module.exports = {
    execute: execute,
    hex: hex,
    formatFault: formatFault
};
