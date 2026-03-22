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
    delta = ((target - (address >>> 0)) | 0);
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
        return match[1] + ' ' + match[2] + ', .' + (((target - (address >>> 0)) | 0) >= 0 ? '+' : '') + (((target - (address >>> 0)) | 0).toString(10));
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

function assembleSource(address, line) {
    var source;

    source = '    .text\n' +
        normalizeSyntax(branchTargetExpression(address, line)) + '\n';
    return toolchain.assembleSourceText(
        source,
        process.env.J68_CPU_TYPE || '68000',
        'm68k assembler/objcopy are required'
    );
}

function assembleLine(address, line) {
    var cleaned = cleanLine(line);
    if (cleaned === '')
        return null;
    validateLine(cleaned);
    if (/^dc\.[bwl]\b/i.test(cleaned))
        return parseDcDirective(cleaned);
    if (mnemonicOf(cleaned) === 'monitor')
        return Uint8Array.from([ 0xa0, 0x00 ]);
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
