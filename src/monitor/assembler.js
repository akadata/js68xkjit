var toolchain = require('../tools/m68k_toolchain');

var ALLOWED = {
    nop: true,
    monitor: true,
    dc: true,
    dbra: true,
    moveq: true,
    move: true,
    movea: true,
    addq: true,
    subq: true,
    cmp: true,
    cmpi: true,
    tst: true,
    bra: true,
    bsr: true,
    bne: true,
    beq: true,
    jmp: true,
    jsr: true,
    rts: true,
    trap: true,
    lea: true,
    pea: true
};

function hex(value, width) {
    return (Array(width + 1).join('0') + ((value >>> 0).toString(16).toUpperCase())).slice(-width);
}

function cleanLine(line) {
    return String(line || '').replace(/;.*/, '').trim();
}

function parseLabelLine(line) {
    var cleaned = cleanLine(line);
    var match;
    if (cleaned === '')
        return null;
    match = /^([a-z_][a-z0-9_]*):(?:\s*(.*))?$/i.exec(cleaned);
    if (!match)
        return {
            label: '',
            instruction: cleaned
        };
    return {
        label: match[1].toLowerCase(),
        instruction: cleanLine(match[2] || '')
    };
}

function parseImmediateLiteral(text) {
    var value = String(text || '').trim();
    if (/^\$[0-9a-f]+$/i.test(value))
        return parseInt(value.slice(1), 16) >>> 0;
    if (/^0x[0-9a-f]+$/i.test(value))
        return parseInt(value, 16) >>> 0;
    if (/^[0-9]+$/i.test(value))
        return parseInt(value, 10) >>> 0;
    throw new Error('invalid immediate: ' + value);
}

function parseAddressLiteral(text) {
    var value = String(text || '').trim();
    if (/^\$[0-9a-f]+$/i.test(value))
        return parseInt(value.slice(1), 16) >>> 0;
    if (/^0x[0-9a-f]+$/i.test(value))
        return parseInt(value, 16) >>> 0;
    if (/^[0-9a-f]+$/i.test(value))
        return parseInt(value, 16) >>> 0;
    throw new Error('invalid literal: ' + value);
}

function normalizeSyntax(line) {
    return line
        .replace(/\$([0-9a-f]+)/gi, '0x$1')
        .replace(/#([0-9]+)\b/g, function (_, value) {
            return '#' + parseImmediateLiteral(value).toString(10);
        })
        .replace(/(^|[^a-z0-9_%])(d[0-7]|a[0-7]|pc|sr|ssp|usp)(?=$|[^a-z0-9_])/gi, function (_, prefix, reg) {
            return prefix + '%' + reg.toLowerCase();
        });
}

function mnemonicOf(line) {
    var cleaned = cleanLine(line);
    var token;
    if (cleaned === '')
        return '';
    token = cleaned.split(/\s+/, 1)[0].toLowerCase();
    return token.split('.', 1)[0];
}

function validateLine(line) {
    var mnemonic = mnemonicOf(line);
    if (mnemonic === '')
        return;
    if (/^dc\.[bwl]\b/i.test(cleanLine(line)))
        return;
    if (!ALLOWED[mnemonic])
        throw new Error('unsupported mnemonic: ' + mnemonic);
}

function isLabelName(text) {
    return /^[a-z_][a-z0-9_]*$/i.test(String(text || '').trim());
}

function branchTargetExpression(address, line) {
    var match = /^(bra|bsr|bne|beq)(?:\.[a-z])?\s+(\$?(?:0x)?[0-9a-f]+)$/i.exec(line);
    var target;
    var delta;
    if (!match)
        return line;
    target = parseAddressLiteral(match[2]);
    delta = ((target - ((address + 2) >>> 0)) | 0);
    if (delta === 0)
        return match[1] + ' .';
    return match[1] + ' .' + (delta > 0 ? '+' : '') + delta;
}

function resolveLabelReference(address, line, labels, allowUnknown) {
    var cleaned = cleanLine(line);
    var mnemonic;
    var parts;
    var operand;
    var label;
    var target;
    var match;

    if (cleaned === '')
        return cleaned;

    mnemonic = cleaned.split(/\s+/, 1)[0];
    parts = cleaned.split(/\s+/, 2);
    operand = parts.length > 1 ? parts[1].trim() : '';

    if (/^(bra|bsr|bne|beq)(?:\.[a-z])?$/i.test(mnemonic) && isLabelName(operand)) {
        label = operand.toLowerCase();
        if (!Object.prototype.hasOwnProperty.call(labels, label)) {
            if (allowUnknown)
                target = address >>> 0;
            else
                throw new Error('unknown label: ' + operand);
        } else {
            target = labels[label] >>> 0;
        }
        if (!/\.[a-z]$/i.test(mnemonic))
            mnemonic += '.w';
        return mnemonic + ' ' + hex(target, 8);
    }

    if (/^(jmp|jsr)(?:\.[a-z])?$/i.test(mnemonic) && isLabelName(operand)) {
        label = operand.toLowerCase();
        if (!Object.prototype.hasOwnProperty.call(labels, label)) {
            if (allowUnknown)
                target = 0;
            else
                throw new Error('unknown label: ' + operand);
        } else {
            target = labels[label] >>> 0;
        }
        return mnemonic + ' (0x' + hex(target, 8) + ').l';
    }

    match = /^(dbra)\s+(d[0-7])\s*,\s*([a-z_][a-z0-9_]*)$/i.exec(cleaned);
    if (match) {
        label = match[3].toLowerCase();
        if (!Object.prototype.hasOwnProperty.call(labels, label)) {
            if (allowUnknown)
                target = address >>> 0;
            else
                throw new Error('unknown label: ' + match[3]);
        } else {
            target = labels[label] >>> 0;
        }
        return match[1] + ' ' + match[2] + ', ' + hex(target, 8);
    }

    match = /^(lea)\s+([a-z_][a-z0-9_]*)\s*,\s*(a[0-7])$/i.exec(cleaned);
    if (match) {
        label = match[2].toLowerCase();
        if (!Object.prototype.hasOwnProperty.call(labels, label)) {
            if (allowUnknown)
                target = 0;
            else
                throw new Error('unknown label: ' + match[2]);
        } else {
            target = labels[label] >>> 0;
        }
        return match[1] + ' 0x' + hex(target, 8) + ',' + match[3];
    }

    match = /^(movea(?:\.l)?)\s+#([a-z_][a-z0-9_]*)\s*,\s*(a[0-7])$/i.exec(cleaned);
    if (match) {
        label = match[2].toLowerCase();
        if (!Object.prototype.hasOwnProperty.call(labels, label)) {
            if (allowUnknown)
                target = 0;
            else
                throw new Error('unknown label: ' + match[2]);
        } else {
            target = labels[label] >>> 0;
        }
        return match[1] + ' #0x' + hex(target, 8) + ',' + match[3];
    }

    return cleaned;
}

function splitDataItems(text) {
    var items = [];
    var current = '';
    var quote = '';
    var i;
    var ch;

    for (i = 0; i < text.length; ++i) {
        ch = text.charAt(i);
        if (quote) {
            current += ch;
            if (ch === quote)
                quote = '';
            continue;
        }
        if (ch === '\'' || ch === '"') {
            quote = ch;
            current += ch;
            continue;
        }
        if (ch === ',') {
            if (current.trim() !== '')
                items.push(current.trim());
            current = '';
            continue;
        }
        current += ch;
    }

    if (quote)
        throw new Error('unterminated string literal');
    if (current.trim() !== '')
        items.push(current.trim());
    return items;
}

function splitOperands(text) {
    var items = [];
    var current = '';
    var depth = 0;
    var i;
    var ch;

    for (i = 0; i < text.length; ++i) {
        ch = text.charAt(i);
        if (ch === '(')
            depth += 1;
        else if (ch === ')' && depth > 0)
            depth -= 1;
        if (ch === ',' && depth === 0) {
            if (current.trim() !== '')
                items.push(current.trim());
            current = '';
            continue;
        }
        current += ch;
    }
    if (current.trim() !== '')
        items.push(current.trim());
    return items;
}

function numericValue(text) {
    var value = String(text || '').trim();
    if (/^\$[0-9a-f]+$/i.test(value))
        return parseInt(value.slice(1), 16) >>> 0;
    if (/^0x[0-9a-f]+$/i.test(value))
        return parseInt(value, 16) >>> 0;
    if (/^[0-9]+$/i.test(value))
        return parseInt(value, 10) >>> 0;
    if (/^[0-9a-f]+$/i.test(value))
        return parseInt(value, 16) >>> 0;
    return null;
}

function immediateWords(size) {
    return size === 'l' ? 2 : 1;
}

function eaExtensionWords(operand, size) {
    var op = String(operand || '').trim().toLowerCase();
    var value;

    if (op === '')
        return 0;
    if (/^#/.test(op))
        return immediateWords(size);
    if (/^%?(d|a)[0-7]$/.test(op) || op === '%pc' || op === 'pc' || op === '%sr' || op === 'sr')
        return 0;
    if (/^\(%?a[0-7]\)$/.test(op) || /^\(%?a[0-7]\)\+$/.test(op) || /^-\(%?a[0-7]\)$/.test(op))
        return 0;
    if (/^\([^)]*\)\.(w|l)$/.test(op))
        return /\)\.l$/.test(op) ? 2 : 1;
    if (/^\(.*\)$/.test(op))
        return 0;
    if (/\.w$/i.test(op))
        return 1;
    if (/\.l$/i.test(op))
        return 2;
    value = numericValue(op);
    if (value !== null)
        return value > 0xffff ? 2 : 1;
    return 0;
}

function expectedInstructionLength(line) {
    var cleaned = cleanLine(line);
    var match;
    var mnemonic;
    var size;
    var operands;

    if (cleaned === '')
        return 0;
    if (/^dc\.[bwl]\b/i.test(cleaned))
        return null;
    if (/^monitor$/i.test(cleaned))
        return 2;

    match = /^([a-z]+)(?:\.([bwl]))?(?:\s+(.*))?$/i.exec(cleaned);
    if (!match)
        return null;
    mnemonic = match[1].toLowerCase();
    size = (match[2] || '').toLowerCase();
    operands = splitOperands(match[3] || '');

    switch (mnemonic) {
        case 'nop':
        case 'rts':
            return 2;
        case 'trap':
        case 'moveq':
        case 'dbra':
            return mnemonic === 'dbra' ? 4 : 2;
        case 'bra':
        case 'bsr':
        case 'bne':
        case 'beq':
            return size === 'b' ? 2 : 4;
        case 'jmp':
        case 'jsr':
        case 'pea':
        case 'lea':
        case 'tst':
        case 'addq':
        case 'subq':
        case 'nbcd':
            return 2 + eaExtensionWords(operands[operands.length - 1], size || 'w') * 2;
        case 'cmpi':
            return 2 + (immediateWords(size || 'w') + eaExtensionWords(operands[1], size || 'w')) * 2;
        case 'cmp':
            return 2 + (eaExtensionWords(operands[0], size || 'w') + eaExtensionWords(operands[1], size || 'w')) * 2;
        case 'movea':
            return 2 + (eaExtensionWords(operands[0], size || 'l') + eaExtensionWords(operands[1], size || 'l')) * 2;
        case 'move':
            return 2 + (eaExtensionWords(operands[0], size || 'w') + eaExtensionWords(operands[1], size || 'w')) * 2;
    }

    return null;
}

function parseDcDirective(line) {
    var match = /^dc\.(b|w|l)\s+(.+)$/i.exec(cleanLine(line));
    var items;
    var bytes = [];
    var width;
    var i;
    var item;
    var stringMatch;
    var j;
    if (!match)
        throw new Error('unsupported dc directive');
    width = match[1].toLowerCase();
    items = splitDataItems(match[2]);
    for (i = 0; i < items.length; ++i) {
        item = items[i];
        stringMatch = /^(['"])(.*)\1$/.exec(item);
        if (stringMatch) {
            if (width !== 'b')
                throw new Error('string literal only allowed in dc.b');
            for (j = 0; j < stringMatch[2].length; ++j)
                bytes.push(stringMatch[2].charCodeAt(j) & 0xff);
            continue;
        }
        if (width === 'b') {
            bytes.push(parseImmediateLiteral(item) & 0xff);
            continue;
        }
        if (width === 'w') {
            var word = parseImmediateLiteral(item) & 0xffff;
            bytes.push((word >>> 8) & 0xff, word & 0xff);
            continue;
        }
        var longword = parseImmediateLiteral(item) >>> 0;
        bytes.push((longword >>> 24) & 0xff, (longword >>> 16) & 0xff, (longword >>> 8) & 0xff, longword & 0xff);
    }
    return Uint8Array.from(bytes);
}

function parseRelativeTarget(address, operand) {
    var match = /^\.((?:[+-][0-9]+)?)$/i.exec(String(operand || '').trim());
    if (!match)
        return null;
    if (!match[1])
        return address >>> 0;
    return (((address >>> 0) + parseInt(match[1], 10)) >>> 0);
}

function branchOpcode(mnemonic) {
    switch (mnemonic.toLowerCase()) {
        case 'bra': return 0x6000;
        case 'bsr': return 0x6100;
        case 'bne': return 0x6600;
        case 'beq': return 0x6700;
    }
    throw new Error('unsupported branch mnemonic: ' + mnemonic);
}

function assembleBranch(address, line) {
    var match = /^(bra|bsr|bne|beq)(?:\.(b|w))?\s+(.+)$/i.exec(cleanLine(line));
    var size;
    var target;
    var displacement;
    var opcode;

    if (!match)
        return null;
    size = (match[2] || 'w').toLowerCase();
    target = parseRelativeTarget(address, match[3]);
    if (target === null)
        target = parseAddressLiteral(match[3]);
    opcode = branchOpcode(match[1]);

    if (size === 'b') {
        displacement = (target - ((address + 2) >>> 0)) | 0;
        if (displacement < -128 || displacement > 127 || displacement === 0)
            throw new Error('branch target out of range for .b');
        return Uint8Array.from([ (opcode >>> 8) & 0xff, displacement & 0xff ]);
    }

    displacement = (target - ((address + 2) >>> 0)) | 0;
    return Uint8Array.from([ (opcode >>> 8) & 0xff, 0x00, (displacement >>> 8) & 0xff, displacement & 0xff ]);
}

function assembleDbra(address, line) {
    var match = /^dbra\s+(d[0-7])\s*,\s*(.+)$/i.exec(cleanLine(line));
    var target;
    var displacement;
    var reg;

    if (!match)
        return null;
    reg = parseInt(match[1].slice(1), 10) & 7;
    target = parseRelativeTarget(address, match[2]);
    if (target === null)
        target = parseAddressLiteral(match[2]);
    displacement = (target - ((address + 2) >>> 0)) | 0;
    return Uint8Array.from([ 0x51, 0xc8 | reg, (displacement >>> 8) & 0xff, displacement & 0xff ]);
}

function parseRegister(text, kind) {
    var match = new RegExp('^' + kind + '([0-7])$', 'i').exec(String(text || '').trim());
    if (!match)
        return null;
    return parseInt(match[1], 10) & 7;
}

function parseImmediateOperand(text) {
    var match = /^#(.+)$/.exec(String(text || '').trim());
    if (!match)
        return null;
    return parseImmediateLiteral(match[1]);
}

function encodeWord(word) {
    return Uint8Array.from([ (word >>> 8) & 0xff, word & 0xff ]);
}

function encodeLong(value) {
    value = value >>> 0;
    return Uint8Array.from([
        (value >>> 24) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 8) & 0xff,
        value & 0xff
    ]);
}

function concatBytes(parts) {
    var total = 0;
    var i;
    var j;
    var out;
    var offset = 0;

    for (i = 0; i < parts.length; ++i)
        total += parts[i].length;
    out = new Uint8Array(total);
    for (i = 0; i < parts.length; ++i) {
        for (j = 0; j < parts[i].length; ++j)
            out[offset + j] = parts[i][j];
        offset += parts[i].length;
    }
    return out;
}

function assembleManual(address, line) {
    var cleaned = cleanLine(line);
    var operands;
    var match;
    var reg;
    var areg;
    var imm;
    var sizeCode;
    var srcMode;
    var srcReg;
    var dstReg;
    var target;

    if (/^nop$/i.test(cleaned))
        return encodeWord(0x4e71);
    if (/^rts$/i.test(cleaned))
        return encodeWord(0x4e75);

    match = /^trap\s+#(.+)$/i.exec(cleaned);
    if (match) {
        imm = parseImmediateLiteral(match[1]);
        if (imm > 15)
            throw new Error('trap vector out of range');
        return encodeWord(0x4e40 | (imm & 0x0f));
    }

    match = /^moveq\s+(#[^,]+)\s*,\s*(d[0-7])$/i.exec(cleaned);
    if (match) {
        reg = parseRegister(match[2], 'd');
        imm = parseImmediateOperand(match[1]);
        if (imm === null || imm > 255)
            throw new Error('moveq immediate out of range');
        return encodeWord(0x7000 | (reg << 9) | (imm & 0xff));
    }

    match = /^movea\.l\s+(#[^,]+)\s*,\s*(a[0-7])$/i.exec(cleaned);
    if (match) {
        areg = parseRegister(match[2], 'a');
        imm = parseImmediateOperand(match[1]);
        if (imm === null)
            throw new Error('invalid movea immediate');
        return concatBytes([ encodeWord(0x207c | (areg << 9)), encodeLong(imm) ]);
    }

    match = /^(addq|subq)\.(b|w|l)\s+(#[^,]+)\s*,\s*((?:d|a)[0-7])$/i.exec(cleaned);
    if (match) {
        imm = parseImmediateOperand(match[3]);
        reg = parseRegister(match[4], 'd');
        areg = parseRegister(match[4], 'a');
        if (imm === null || imm < 1 || imm > 8)
            throw new Error('quick immediate out of range');
        if (imm === 8)
            imm = 0;
        sizeCode = { b: 0, w: 1, l: 2 }[match[2].toLowerCase()];
        if (reg !== null)
            return encodeWord((match[1].toLowerCase() === 'subq' ? 0x5100 : 0x5000) | (imm << 9) | (sizeCode << 6) | reg);
        if (areg !== null) {
            if (sizeCode === 0)
                throw new Error('address-register quick byte size is invalid');
            return encodeWord((match[1].toLowerCase() === 'subq' ? 0x5100 : 0x5000) | (imm << 9) | (sizeCode << 6) | (1 << 3) | areg);
        }
    }

    match = /^cmpi\.(b|w|l)\s+(#[^,]+)\s*,\s*(d[0-7])$/i.exec(cleaned);
    if (match) {
        reg = parseRegister(match[3], 'd');
        imm = parseImmediateOperand(match[2]);
        sizeCode = { b: 0, w: 1, l: 2 }[match[1].toLowerCase()];
        if (sizeCode === 0)
            return concatBytes([ encodeWord(0x0c00 | reg), encodeWord(imm & 0xff) ]);
        if (sizeCode === 1)
            return concatBytes([ encodeWord(0x0c40 | reg), encodeWord(imm & 0xffff) ]);
        return concatBytes([ encodeWord(0x0c80 | reg), encodeLong(imm) ]);
    }

    match = /^move\.b\s+\((a[0-7])\)\+\s*,\s*(d[0-7])$/i.exec(cleaned);
    if (match) {
        srcReg = parseRegister(match[1], 'a');
        dstReg = parseRegister(match[2], 'd');
        return encodeWord(0x1000 | (dstReg << 9) | (3 << 3) | srcReg);
    }

    match = /^move\.b\s+(d[0-7])\s*,\s*\((a[0-7])\)$/i.exec(cleaned);
    if (match) {
        srcReg = parseRegister(match[1], 'd');
        dstReg = parseRegister(match[2], 'a');
        return encodeWord(0x1000 | (dstReg << 9) | (2 << 6) | srcReg);
    }

    match = /^(jsr|jmp)\s+\((0x[0-9a-f]+)\)\.l$/i.exec(cleaned);
    if (match) {
        target = parseAddressLiteral(match[2]);
        return concatBytes([
            encodeWord((match[1].toLowerCase() === 'jsr' ? 0x4eb9 : 0x4ef9)),
            encodeLong(target)
        ]);
    }

    return null;
}

function assembleSource(address, line) {
    var source;
    var bytes;
    var expectedLength;

    source = '    .text\n' +
        normalizeSyntax(branchTargetExpression(address, line)) + '\n';
    bytes = toolchain.assembleSourceText(
        source,
        process.env.J68_CPU_TYPE || '68000',
        'm68k assembler/objcopy are required'
    );
    expectedLength = expectedInstructionLength(line);
    if (expectedLength !== null && bytes.length >= expectedLength)
        return bytes.slice(0, expectedLength);
    return bytes;
}

function assembleLine(address, line) {
    var cleaned = cleanLine(line);
    var branchBytes;
    var dbraBytes;
    var manualBytes;
    if (cleaned === '')
        return null;
    validateLine(cleaned);
    if (/^dc\.[bwl]\b/i.test(cleaned))
        return parseDcDirective(cleaned);
    if (mnemonicOf(cleaned) === 'monitor')
        return Uint8Array.from([ 0xa0, 0x00 ]);
    branchBytes = assembleBranch(address >>> 0, cleaned);
    if (branchBytes)
        return branchBytes;
    dbraBytes = assembleDbra(address >>> 0, cleaned);
    if (dbraBytes)
        return dbraBytes;
    manualBytes = assembleManual(address >>> 0, cleaned);
    if (manualBytes)
        return manualBytes;
    return assembleSource(address >>> 0, cleaned);
}

function collectSourceEntries(address, text) {
    var lines = String(text || '').split(/\r?\n/);
    var entries = [];
    var startAddress = address >>> 0;
    var firstLine = true;
    var i;

    for (i = 0; i < lines.length; ++i) {
        var cleaned = cleanLine(lines[i]);
        var parsed;
        var match;
        if (cleaned === '')
            continue;
        if (firstLine) {
            match = /^a\s+(\$[0-9a-f]+|(0x)?[0-9a-f]+)$/i.exec(cleaned);
            if (match) {
                startAddress = parseAddressLiteral(match[1]) >>> 0;
                firstLine = false;
                continue;
            }
        }
        parsed = parseLabelLine(cleaned);
        entries.push({
            line: cleaned,
            label: parsed.label,
            instruction: parsed.instruction
        });
        firstLine = false;
    }

    return {
        baseAddress: startAddress >>> 0,
        entries: entries
    };
}

function assembleText(address, text) {
    var collected = collectSourceEntries(address, text);
    var labels = {};
    var output = [];
    var pc = collected.baseAddress >>> 0;
    var i;

    for (i = 0; i < collected.entries.length; ++i) {
        var entry = collected.entries[i];
        var resolved;
        var bytes;

        if (entry.label) {
            if (Object.prototype.hasOwnProperty.call(labels, entry.label))
                throw new Error('duplicate label: ' + entry.label);
            labels[entry.label] = pc >>> 0;
        }

        if (!entry.instruction)
            continue;

        entry.address = pc >>> 0;
        resolved = resolveLabelReference(entry.address, entry.instruction, labels, true);
        bytes = assembleLine(entry.address, resolved);
        pc = (pc + (bytes ? bytes.length : 0)) >>> 0;
    }

    pc = collected.baseAddress >>> 0;
    for (i = 0; i < collected.entries.length; ++i) {
        var finalEntry = collected.entries[i];
        var finalBytes;
        var j;

        finalEntry.address = pc >>> 0;

        if (!finalEntry.instruction)
            continue;

        finalBytes = assembleLine(finalEntry.address, resolveLabelReference(finalEntry.address, finalEntry.instruction, labels, false));
        if (!finalBytes)
            continue;
        for (j = 0; j < finalBytes.length; ++j)
            output.push(finalBytes[j]);
        pc = (pc + finalBytes.length) >>> 0;
    }

    return {
        address: collected.baseAddress >>> 0,
        bytes: Uint8Array.from(output),
        length: (pc - (collected.baseAddress >>> 0)) >>> 0
    };
}

function createSession(machine, address, helpers) {
    var pc = address >>> 0;
    var hexFormat = helpers.hex;

    return {
        prompt: function () {
            return hexFormat(pc, 8) + '  ';
        },
        handle: function (line) {
            var bytes;
            var i;
            try {
                bytes = assembleLine(pc, line);
            } catch (error) {
                return {
                    output: 'ERR ' + error.message,
                    suppressPrompt: true
                };
            }
            if (!bytes) {
                return {
                    output: 'ASSEMBLY DONE',
                    exitMode: true
                };
            }
            for (i = 0; i < bytes.length; ++i)
                machine.write8(pc + i, bytes[i]);
            pc = (pc + bytes.length) >>> 0;
            return {
                suppressPrompt: true
            };
        }
    };
}

module.exports = {
    createSession: createSession,
    assembleLine: assembleLine,
    assembleText: assembleText,
    cleanLine: cleanLine
};
