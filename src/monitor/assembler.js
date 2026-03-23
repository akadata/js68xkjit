var ALLOWED = {
    nop: true,
    monitor: true,
    dc: true,
    dbra: true,
    moveq: true,
    move: true,
    movea: true,
    add: true,
    adda: true,
    addi: true,
    addq: true,
    addx: true,
    and: true,
    andi: true,
    asl: true,
    asr: true,
    bchg: true,
    bclr: true,
    bset: true,
    btst: true,
    chk: true,
    clr: true,
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
    pea: true,
    nbcd: true,
    abcd: true,
    sbcd: true,
    or: true,
    ori: true,
    eor: true,
    eori: true,
    exg: true,
    ext: true,
    illegal: true,
    link: true,
    lsl: true,
    lsr: true,
    movem: true,
    movep: true,
    muls: true,
    mulu: true,
    neg: true,
    negx: true,
    not: true,
    rol: true,
    ror: true,
    roxl: true,
    roxr: true,
    reset: true,
    rte: true,
    rtr: true,
    scc: true,
    scs: true,
    seq: true,
    sf: true,
    sge: true,
    sgt: true,
    shi: true,
    sle: true,
    sls: true,
    slt: true,
    smi: true,
    sne: true,
    spl: true,
    st: true,
    stop: true,
    sub: true,
    suba: true,
    subi: true,
    subx: true,
    svc: true,
    svs: true,
    swap: true,
    tas: true,
    trapv: true,
    unlk: true,
    cmpa: true,
    cmpm: true,
    divs: true,
    divu: true
};

var currentSymbols = null;
var LABEL_RE = '[.]?[a-z_][a-z0-9_]*';

function isRegisterMaskOperand(text) {
    var operand = String(text || '').trim().toLowerCase();
    if (operand === '')
        return false;
    if (/[()]/.test(operand))
        return false;
    if (operand.indexOf('/') !== -1)
        return true;
    if (/^[da][0-7]-[da][0-7]/.test(operand))
        return true;
    if (/^[da][0-7](?:\/[da][0-7])+$/.test(operand))
        return true;
    return /^[da][0-7]$/.test(operand);
}

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
    match = new RegExp('^(' + LABEL_RE + '):(?:\\s*(.*))?$', 'i').exec(cleaned);
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
    var expressionValue;
    if (/^-?[0-9]+$/i.test(value))
        return (parseInt(value, 10) | 0) >>> 0;
    if (/^-\$[0-9a-f]+$/i.test(value))
        return (-parseInt(value.slice(2), 16)) >>> 0;
    if (/^-0x[0-9a-f]+$/i.test(value))
        return (-parseInt(value.slice(3), 16)) >>> 0;
    if (/^\$[0-9a-f]+$/i.test(value))
        return parseInt(value.slice(1), 16) >>> 0;
    if (/^0x[0-9a-f]+$/i.test(value))
        return parseInt(value, 16) >>> 0;
    expressionValue = evaluateExpression(value);
    if (expressionValue !== null)
        return expressionValue >>> 0;
    throw new Error('invalid immediate: ' + value);
}

function parseAddressLiteral(text) {
    var value = String(text || '').trim();
    var expressionValue;
    if (/^\$[0-9a-f]+$/i.test(value))
        return parseInt(value.slice(1), 16) >>> 0;
    if (/^0x[0-9a-f]+$/i.test(value))
        return parseInt(value, 16) >>> 0;
    if (/^[0-9a-f]+$/i.test(value))
        return parseInt(value, 16) >>> 0;
    expressionValue = evaluateExpression(value);
    if (expressionValue !== null)
        return expressionValue >>> 0;
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
    if (/^org\b/i.test(cleanLine(line)))
        return;
    if (new RegExp('^' + LABEL_RE + '\\s+equ\\b', 'i').test(cleanLine(line)))
        return;
    if (/^dc\.[bwl]\b/i.test(cleanLine(line)))
        return;
    if (!ALLOWED[mnemonic])
        throw new Error('Illegal Instruction');
}

function isLabelName(text) {
    return new RegExp('^' + LABEL_RE + '$', 'i').test(String(text || '').trim());
}

function symbolValue(text) {
    var key = String(text || '').trim().toLowerCase();
    if (!currentSymbols || !Object.prototype.hasOwnProperty.call(currentSymbols, key))
        return null;
    return currentSymbols[key] >>> 0;
}

function expressionAtom(text) {
    var value = String(text || '').trim();
    var symbol = symbolValue(value);
    if (symbol !== null)
        return symbol >>> 0;
    if (/^-?[0-9]+$/i.test(value))
        return (parseInt(value, 10) | 0) >>> 0;
    if (/^-\$[0-9a-f]+$/i.test(value))
        return (-parseInt(value.slice(2), 16)) >>> 0;
    if (/^-0x[0-9a-f]+$/i.test(value))
        return (-parseInt(value.slice(3), 16)) >>> 0;
    if (/^\$[0-9a-f]+$/i.test(value))
        return parseInt(value.slice(1), 16) >>> 0;
    if (/^0x[0-9a-f]+$/i.test(value))
        return parseInt(value, 16) >>> 0;
    if (/^[0-9a-f]+$/i.test(value))
        return parseInt(value, 16) >>> 0;
    return null;
}

function evaluateExpression(text) {
    var value = String(text || '').trim();
    var orParts;
    var i;
    var result = 0;

    if (value === '')
        return null;
    orParts = value.split('|');
    for (i = 0; i < orParts.length; ++i) {
        var sumText = orParts[i].trim();
        var tokens;
        var j;
        var sum;
        var sign;
        if (sumText === '')
            return null;
        tokens = sumText.split(/([+-])/).map(function (token) {
            return token.trim();
        }).filter(Boolean);
        sum = null;
        sign = '+';
        for (j = 0; j < tokens.length; ++j) {
            var token = tokens[j];
            var atom;
            if (token === '+' || token === '-') {
                sign = token;
                continue;
            }
            atom = expressionAtom(token);
            if (atom === null)
                return null;
            if (sum === null)
                sum = atom >>> 0;
            else if (sign === '+')
                sum = (sum + atom) >>> 0;
            else
                sum = (sum - atom) >>> 0;
        }
        if (sum === null)
            return null;
        result = (result | sum) >>> 0;
    }
    return result >>> 0;
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

    match = new RegExp('^(dbra)\\s+(d[0-7])\\s*,\\s*(' + LABEL_RE + ')$', 'i').exec(cleaned);
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

    match = new RegExp('^(movea(?:\\.l)?)\\s+#(' + LABEL_RE + ')\\s*,\\s*(a[0-7])$', 'i').exec(cleaned);
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
    if (/^-?[0-9]+$/i.test(value))
        return (parseInt(value, 10) | 0) >>> 0;
    if (/^-\$[0-9a-f]+$/i.test(value))
        return (-parseInt(value.slice(2), 16)) >>> 0;
    if (/^-0x[0-9a-f]+$/i.test(value))
        return (-parseInt(value.slice(3), 16)) >>> 0;
    if (/^\$[0-9a-f]+$/i.test(value))
        return parseInt(value.slice(1), 16) >>> 0;
    if (/^0x[0-9a-f]+$/i.test(value))
        return parseInt(value, 16) >>> 0;
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
    var bitSrc;

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
    bitSrc = operands.length > 0 ? String(operands[0]).trim() : '';

    switch (mnemonic) {
        case 'nop':
        case 'rts':
            return 2;
        case 'trap':
        case 'moveq':
        case 'dbra':
            return mnemonic === 'dbra' ? 4 : 2;
        case 'illegal':
        case 'reset':
        case 'rte':
        case 'rtr':
        case 'swap':
        case 'trapv':
        case 'unlk':
        case 'ext':
        case 'exg':
            return 2;
        case 'stop':
        case 'link':
            return 4;
        case 'bra':
        case 'bsr':
        case 'bne':
        case 'beq':
            return size === 'b' || size === 's' ? 2 : 4;
        case 'jmp':
        case 'jsr':
        case 'pea':
        case 'lea':
        case 'tst':
        case 'addq':
        case 'subq':
        case 'nbcd':
        case 'asl':
        case 'asr':
        case 'bchg':
        case 'bclr':
        case 'bset':
        case 'btst':
        case 'lsl':
        case 'lsr':
        case 'rol':
        case 'ror':
        case 'roxl':
        case 'roxr':
            if (/^b(chg|clr|set|tst)$/.test(mnemonic))
                return 2 + eaExtensionWords(operands[1], 'w') * 2 + (/^#/.test(bitSrc) ? 2 : 0);
            return 2 + eaExtensionWords(operands[operands.length - 1], size || 'w') * 2;
        case 'abcd':
        case 'sbcd':
        case 'addx':
        case 'subx':
        case 'cmpm':
            return 2;
        case 'chk':
        case 'cmpa':
        case 'divs':
        case 'divu':
        case 'muls':
        case 'mulu':
        case 'suba':
            return 2 + eaExtensionWords(operands[0], size || 'w') * 2;
        case 'clr':
        case 'neg':
        case 'negx':
        case 'not':
            return 2 + eaExtensionWords(operands[operands.length - 1], size || 'w') * 2;
        case 'tas':
        case 'scc':
        case 'scs':
        case 'seq':
        case 'sf':
        case 'sge':
        case 'sgt':
        case 'shi':
        case 'sle':
        case 'sls':
        case 'slt':
        case 'smi':
        case 'sne':
        case 'spl':
        case 'st':
        case 'svc':
        case 'svs':
            return 2 + eaExtensionWords(operands[operands.length - 1], 'b') * 2;
        case 'movep':
            return 4;
        case 'movem': {
            var eaOperand = isRegisterMaskOperand(operands[0]) ? operands[1] : operands[0];
            return 4 + eaExtensionWords(eaOperand, size || 'w') * 2;
        }
        case 'add':
        case 'and':
        case 'eor':
        case 'or':
        case 'sub':
            return 2 + eaExtensionWords(operands[0], size || 'w') * 2 + eaExtensionWords(operands[1], size || 'w') * 2;
        case 'addi':
        case 'andi':
        case 'eori':
        case 'ori':
        case 'subi':
            return 2 + immediateWords(size || 'w') * 2 + eaExtensionWords(operands[1], size || 'w') * 2;
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
    var match = /^(bra|bsr|bne|beq)(?:\.(b|s|w))?\s+(.+)$/i.exec(cleanLine(line));
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

    if (size === 'b' || size === 's') {
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

function signed32(value) {
    return value >> 0;
}

function encodeWords(words) {
    var out = [];
    var i;
    var value;

    for (i = 0; i < words.length; ++i) {
        value = words[i] & 0xffff;
        out.push((value >>> 8) & 0xff, value & 0xff);
    }
    return Uint8Array.from(out);
}

function appendEa(parts, ea) {
    if (ea.extWords && ea.extWords.length)
        parts.push(encodeWords(ea.extWords));
    return concatBytes(parts);
}

function parseIndexRegister(text) {
    var match = /^([ad])([0-7])(?:\.(w|l))?$/i.exec(String(text || '').trim());

    if (!match)
        return null;
    return {
        isAddress: match[1].toLowerCase() === 'a',
        reg: parseInt(match[2], 10) & 7,
        long: (match[3] || 'w').toLowerCase() === 'l'
    };
}

function parseRegisterMask(text) {
    var parts = String(text || '').trim().toLowerCase().split('/');
    var mask = 0;
    var i;
    var j;
    var range;
    var startKind;
    var startIndex;
    var endKind;
    var endIndex;

    function regBit(kind, index) {
        return kind === 'd' ? index : index + 8;
    }

    for (i = 0; i < parts.length; ++i) {
        if (parts[i] === '')
            continue;
        range = /^([da])([0-7])\-([da])([0-7])$/i.exec(parts[i]);
        if (range) {
            startKind = range[1].toLowerCase();
            startIndex = parseInt(range[2], 10) & 7;
            endKind = range[3].toLowerCase();
            endIndex = parseInt(range[4], 10) & 7;
            if (startKind !== endKind || endIndex < startIndex)
                throw new Error('invalid register mask: ' + text);
            for (j = startIndex; j <= endIndex; ++j)
                mask |= 1 << regBit(startKind, j);
            continue;
        }
        range = /^([da])([0-7])$/i.exec(parts[i]);
        if (!range)
            throw new Error('invalid register mask: ' + text);
        mask |= 1 << regBit(range[1].toLowerCase(), parseInt(range[2], 10) & 7);
    }

    return mask & 0xffff;
}

function parseEaOperand(text, size, allowImmediate) {
    var operand = String(text || '').trim().toLowerCase();
    var reg;
    var match;
    var value;
    var inner;
    var parts;
    var baseReg;
    var index;
    var disp;

    if (operand === '')
        throw new Error('Syntax Error');

    reg = parseRegister(operand, 'd');
    if (reg !== null)
        return { mode: 0, reg: reg, extWords: [], kind: 'dn' };

    reg = parseRegister(operand, 'a');
    if (reg !== null)
        return { mode: 1, reg: reg, extWords: [], kind: 'an' };

    match = /^\((a[0-7])\)$/i.exec(operand);
    if (match)
        return { mode: 2, reg: parseRegister(match[1], 'a'), extWords: [], kind: 'mem' };

    match = /^\((a[0-7])\)\+$/i.exec(operand);
    if (match)
        return { mode: 3, reg: parseRegister(match[1], 'a'), extWords: [], kind: 'mem' };

    match = /^-\((a[0-7])\)$/i.exec(operand);
    if (match)
        return { mode: 4, reg: parseRegister(match[1], 'a'), extWords: [], kind: 'mem' };

    if (/^#/.test(operand)) {
        if (allowImmediate === false)
            throw new Error('Illegal Instruction');
        value = parseImmediateLiteral(operand.slice(1));
        if (size === 'l')
            return { mode: 7, reg: 4, extWords: [ (value >>> 16) & 0xffff, value & 0xffff ], kind: 'imm' };
        return { mode: 7, reg: 4, extWords: [ size === 'b' ? (value & 0xff) : (value & 0xffff) ], kind: 'imm' };
    }

    inner = operand;
    if (/^\(.*\)$/.test(operand) && operand.indexOf(',') !== -1 && !/^\((a[0-7])\)$/i.test(operand))
        inner = operand.slice(1, -1);
    parts = splitOperands(inner);
    if (parts.length === 2) {
        baseReg = parseRegister(parts[1], 'a');
        if (baseReg !== null) {
            disp = parseImmediateLiteral(parts[0]);
            return { mode: 5, reg: baseReg, extWords: [ disp & 0xffff ], kind: 'mem' };
        }
    }
    if (parts.length === 3) {
        disp = parseImmediateLiteral(parts[0]) & 0xff;
        baseReg = parseRegister(parts[1], 'a');
        index = parseIndexRegister(parts[2]);
        if (baseReg !== null && index) {
            value = (index.isAddress ? 0x8000 : 0) | ((index.reg & 7) << 12) | (index.long ? 0x0800 : 0) | disp;
            return { mode: 6, reg: baseReg, extWords: [ value & 0xffff ], kind: 'mem' };
        }
    }

    match = /^(.+)\((a[0-7])(?:,([ad][0-7](?:\.(?:w|l))?))?\)$/i.exec(operand);
    if (match) {
        disp = parseImmediateLiteral(match[1]);
        baseReg = parseRegister(match[2], 'a');
        if (!match[3])
            return { mode: 5, reg: baseReg, extWords: [ disp & 0xffff ], kind: 'mem' };
        index = parseIndexRegister(match[3]);
        if (!index)
            throw new Error('Syntax Error');
        value = (index.isAddress ? 0x8000 : 0) | ((index.reg & 7) << 12) | (index.long ? 0x0800 : 0) | (disp & 0xff);
        return { mode: 6, reg: baseReg, extWords: [ value & 0xffff ], kind: 'mem' };
    }

    match = /^(.*)\.(w|l)$/i.exec(operand);
    if (match) {
        value = parseAddressLiteral(match[1]);
        return match[2].toLowerCase() === 'w'
            ? { mode: 7, reg: 0, extWords: [ value & 0xffff ], kind: 'mem' }
            : { mode: 7, reg: 1, extWords: [ (value >>> 16) & 0xffff, value & 0xffff ], kind: 'mem' };
    }

    value = numericValue(operand);
    if (value !== null) {
        if (value <= 0xffff)
            return { mode: 7, reg: 0, extWords: [ value & 0xffff ], kind: 'mem' };
        return { mode: 7, reg: 1, extWords: [ (value >>> 16) & 0xffff, value & 0xffff ], kind: 'mem' };
    }

    throw new Error('Syntax Error');
}

function encodeMoveInstruction(size, src, dst) {
    var sizeNibble = { b: 0x1000, l: 0x2000, w: 0x3000 }[size];

    if (!sizeNibble)
        throw new Error('Illegal Instruction');
    return appendEa([
        encodeWord(sizeNibble | ((dst.reg & 7) << 9) | ((dst.mode & 7) << 6) | ((src.mode & 7) << 3) | (src.reg & 7))
    ], {
        extWords: src.extWords.concat(dst.extWords)
    });
}

function encodeUnaryEa(baseBySize, size, operand) {
    var ea = parseEaOperand(operand, size, false);
    var base = baseBySize[size];

    if (base === undefined)
        throw new Error('Illegal Instruction');
    return appendEa([ encodeWord(base | ((ea.mode & 7) << 3) | (ea.reg & 7)) ], ea);
}

function encodeConditionMnemonic(mnemonic) {
    var map = {
        st: 0x0, sf: 0x1, shi: 0x2, sls: 0x3, scc: 0x4, scs: 0x5,
        sne: 0x6, seq: 0x7, svc: 0x8, svs: 0x9, spl: 0xa, smi: 0xb,
        sge: 0xc, slt: 0xd, sgt: 0xe, sle: 0xf
    };

    if (!Object.prototype.hasOwnProperty.call(map, mnemonic))
        throw new Error('Illegal Instruction');
    return map[mnemonic];
}

function encodeQuickInstruction(mnemonic, size, immText, dstText) {
    var imm = signed32(parseImmediateOperand(immText));
    var ea;
    var sizeCode = { b: 0, w: 1, l: 2 }[size];
    var data;
    var base;

    if (sizeCode === undefined)
        throw new Error('Illegal Instruction');
    if (imm < 1 || imm > 8)
        throw new Error('Syntax Error');
    data = imm === 8 ? 0 : imm;
    ea = parseEaOperand(dstText, size, false);
    if (ea.mode === 1 && size === 'b')
        throw new Error('Illegal Instruction');
    base = mnemonic === 'subq' ? 0x5100 : 0x5000;
    return appendEa([ encodeWord(base | ((data & 7) << 9) | (sizeCode << 6) | ((ea.mode & 7) << 3) | (ea.reg & 7)) ], ea);
}

function encodeImmediateInstruction(mnemonic, size, immText, dstText) {
    var imm = parseImmediateOperand(immText);
    var sizeBase = { b: 0x0000, w: 0x0040, l: 0x0080 }[size];
    var familyBase = { ori: 0x0000, andi: 0x0200, subi: 0x0400, addi: 0x0600, eori: 0x0a00, cmpi: 0x0c00 }[mnemonic];
    var dst;
    var parts;

    if (familyBase === undefined || sizeBase === undefined)
        throw new Error('Illegal Instruction');

    if (dstText.toLowerCase() === 'ccr') {
        if (mnemonic === 'ori')
            return concatBytes([ encodeWord(0x003c), encodeWord(imm & 0xff) ]);
        if (mnemonic === 'andi')
            return concatBytes([ encodeWord(0x023c), encodeWord(imm & 0xff) ]);
        if (mnemonic === 'eori')
            return concatBytes([ encodeWord(0x0a3c), encodeWord(imm & 0xff) ]);
        throw new Error('Illegal Instruction');
    }
    if (dstText.toLowerCase() === 'sr') {
        if (mnemonic === 'ori')
            return concatBytes([ encodeWord(0x007c), encodeWord(imm & 0xffff) ]);
        if (mnemonic === 'andi')
            return concatBytes([ encodeWord(0x027c), encodeWord(imm & 0xffff) ]);
        if (mnemonic === 'eori')
            return concatBytes([ encodeWord(0x0a7c), encodeWord(imm & 0xffff) ]);
        throw new Error('Illegal Instruction');
    }

    dst = parseEaOperand(dstText, size, false);
    parts = [ encodeWord(familyBase | sizeBase | ((dst.mode & 7) << 3) | (dst.reg & 7)) ];
    if (size === 'l')
        parts.push(encodeLong(imm));
    else
        parts.push(encodeWord(size === 'b' ? (imm & 0xff) : (imm & 0xffff)));
    return appendEa(parts, dst);
}

function encodeEaToDn(base, size, dstReg, srcText) {
    var src = parseEaOperand(srcText, size, true);
    var opmode = { b: 0, w: 1, l: 2 }[size];

    return appendEa([ encodeWord(base | ((dstReg & 7) << 9) | (opmode << 6) | ((src.mode & 7) << 3) | (src.reg & 7)) ], src);
}

function encodeDnToEa(base, size, srcReg, dstText) {
    var dst = parseEaOperand(dstText, size, false);
    var opmode = { b: 4, w: 5, l: 6 }[size];

    return appendEa([ encodeWord(base | ((srcReg & 7) << 9) | (opmode << 6) | ((dst.mode & 7) << 3) | (dst.reg & 7)) ], dst);
}

function encodeAddSubLogic(mnemonic, size, srcText, dstText) {
    var srcDn = parseRegister(srcText, 'd');
    var dstDn = parseRegister(dstText, 'd');
    var dstAn = parseRegister(dstText, 'a');
    var srcAn = parseRegister(srcText, 'a');
    var baseMap = { add: 0xd000, sub: 0x9000, and: 0xc000, or: 0x8000, cmp: 0xb000, eor: 0xb000 };

    if (parseImmediateOperand(srcText) !== null) {
        if (mnemonic === 'cmp')
            return encodeImmediateInstruction('cmpi', size, srcText, dstText);
        if (mnemonic === 'add')
            return encodeImmediateInstruction('addi', size, srcText, dstText);
        if (mnemonic === 'sub')
            return encodeImmediateInstruction('subi', size, srcText, dstText);
        if (mnemonic === 'and')
            return encodeImmediateInstruction('andi', size, srcText, dstText);
        if (mnemonic === 'or')
            return encodeImmediateInstruction('ori', size, srcText, dstText);
        if (mnemonic === 'eor')
            return encodeImmediateInstruction('eori', size, srcText, dstText);
    }

    if (mnemonic === 'cmp' && /^\(a[0-7]\)\+$/i.test(srcText) && /^\(a[0-7]\)\+$/i.test(dstText)) {
        return encodeWord(0xb108 | ((parseRegister(dstText.replace(/[()+-]/g, ''), 'a') & 7) << 9) | ({ b: 0, w: 1, l: 2 }[size] << 6) | (parseRegister(srcText.replace(/[()+-]/g, ''), 'a') & 7));
    }

    if (mnemonic === 'cmp' && dstAn !== null) {
        return appendEa([
            encodeWord(0xb0c0 | ((dstAn & 7) << 9) | (size === 'l' ? 0x01c0 : 0x00c0) | ((parseEaOperand(srcText, size === 'l' ? 'l' : 'w', true).mode & 7) << 3) | (parseEaOperand(srcText, size === 'l' ? 'l' : 'w', true).reg & 7))
        ], parseEaOperand(srcText, size === 'l' ? 'l' : 'w', true));
    }

    if ((mnemonic === 'add' || mnemonic === 'sub' || mnemonic === 'and' || mnemonic === 'or') && dstAn !== null)
        return appendEa([
            encodeWord((mnemonic === 'add' ? 0xd0c0 : 0x90c0) | ((dstAn & 7) << 9) | (size === 'l' ? 0x0100 : 0x0000) | ((parseEaOperand(srcText, size === 'l' ? 'l' : 'w', true).mode & 7) << 3) | (parseEaOperand(srcText, size === 'l' ? 'l' : 'w', true).reg & 7))
        ], parseEaOperand(srcText, size === 'l' ? 'l' : 'w', true));

    if (dstDn !== null && mnemonic !== 'eor')
        return encodeEaToDn(baseMap[mnemonic], size, dstDn, srcText);
    if (mnemonic === 'cmp' && dstDn !== null)
        return encodeEaToDn(baseMap[mnemonic], size, dstDn, srcText);
    if (srcDn !== null)
        return encodeDnToEa(baseMap[mnemonic], size, srcDn, dstText);
    if (srcAn !== null && (mnemonic === 'add' || mnemonic === 'sub') && dstAn !== null)
        return appendEa([ encodeWord((mnemonic === 'add' ? 0xd0c0 : 0x90c0) | ((dstAn & 7) << 9) | (size === 'l' ? 0x0100 : 0x0000) | (1 << 3) | (srcAn & 7)) ], { extWords: [] });

    throw new Error('Illegal Instruction');
}

function encodeChkMulDiv(mnemonic, srcText, dstText) {
    var dst = parseRegister(dstText, 'd');
    var src = parseEaOperand(srcText, mnemonic === 'chk' ? 'w' : 'w', true);
    var base = { chk: 0x4180, divu: 0x80c0, divs: 0x81c0, mulu: 0xc0c0, muls: 0xc1c0 }[mnemonic];

    if (dst === null || base === undefined)
        throw new Error('Illegal Instruction');
    return appendEa([ encodeWord(base | ((dst & 7) << 9) | ((src.mode & 7) << 3) | (src.reg & 7)) ], src);
}

function encodeMoveSpecial(cleaned, mnemonic, size, operands) {
    var srcText = operands[0];
    var dstText = operands[1];
    var src;
    var dst;
    var reg;

    if (mnemonic === 'move' && operands.length === 2) {
        if (dstText.toLowerCase() === 'ccr') {
            src = parseEaOperand(srcText, 'w', true);
            return appendEa([ encodeWord(0x44c0 | ((src.mode & 7) << 3) | (src.reg & 7)) ], src);
        }
        if (dstText.toLowerCase() === 'sr') {
            src = parseEaOperand(srcText, 'w', true);
            return appendEa([ encodeWord(0x46c0 | ((src.mode & 7) << 3) | (src.reg & 7)) ], src);
        }
        if (srcText.toLowerCase() === 'sr') {
            dst = parseEaOperand(dstText, 'w', false);
            return appendEa([ encodeWord(0x40c0 | ((dst.mode & 7) << 3) | (dst.reg & 7)) ], dst);
        }
        if (srcText.toLowerCase() === 'usp') {
            reg = parseRegister(dstText, 'a');
            if (reg === null)
                throw new Error('Illegal Instruction');
            return encodeWord(0x4e68 | reg);
        }
        if (dstText.toLowerCase() === 'usp') {
            reg = parseRegister(srcText, 'a');
            if (reg === null)
                throw new Error('Illegal Instruction');
            return encodeWord(0x4e60 | reg);
        }
        return encodeMoveInstruction(size || 'w', parseEaOperand(srcText, size || 'w', true), parseEaOperand(dstText, size || 'w', false));
    }

    if (mnemonic === 'movea') {
        reg = parseRegister(dstText, 'a');
        src = parseEaOperand(srcText, size || 'w', true);
        if (reg === null)
            throw new Error('Illegal Instruction');
        return appendEa([ encodeWord((size === 'l' ? 0x2040 : 0x3040) | ((reg & 7) << 9) | ((src.mode & 7) << 3) | (src.reg & 7)) ], src);
    }

    throw new Error('Illegal Instruction');
}

function encodeShiftRotateInstruction(mnemonic, size, operands) {
    var kind = { asr: 0, asl: 0, lsr: 1, lsl: 1, roxr: 2, roxl: 2, ror: 3, rol: 3 }[mnemonic];
    var left = /l$/.test(mnemonic);
    var dst = parseEaOperand(operands[operands.length - 1], size || 'w', false);
    var countReg;
    var countImm;
    var sizeCode;
    var word;

    if (!size) {
        if (dst.mode === 0 || dst.mode === 1)
            throw new Error('Illegal Instruction');
        word = 0xe0c0 | (kind << 9) | (left ? 0x0100 : 0x0000) | ((dst.mode & 7) << 3) | (dst.reg & 7);
        return appendEa([ encodeWord(word) ], dst);
    }

    sizeCode = { b: 0, w: 1, l: 2 }[size];
    if (sizeCode === undefined || dst.mode !== 0)
        throw new Error('Illegal Instruction');
    countReg = parseRegister(operands[0], 'd');
    if (countReg !== null) {
        word = 0xe020 | ((countReg & 7) << 9) | (left ? 0x0100 : 0x0000) | (sizeCode << 6) | (1 << 5) | (kind << 3) | (dst.reg & 7);
        return encodeWord(word);
    }
    countImm = signed32(parseImmediateOperand(operands[0]));
    if (countImm < 1 || countImm > 8)
        throw new Error('Syntax Error');
    word = 0xe000 | (((countImm & 7) === 8 ? 0 : (countImm & 7)) << 9) | (left ? 0x0100 : 0x0000) | (sizeCode << 6) | (kind << 3) | (dst.reg & 7);
    return encodeWord(word);
}

function encodeBitInstruction(mnemonic, operands) {
    var baseImm = { btst: 0x0800, bchg: 0x0840, bclr: 0x0880, bset: 0x08c0 }[mnemonic];
    var baseReg = { btst: 0x0100, bchg: 0x0140, bclr: 0x0180, bset: 0x01c0 }[mnemonic];
    var dst = parseEaOperand(operands[1], 'b', false);
    var reg = parseRegister(operands[0], 'd');
    var imm;
    var parts;

    if (reg !== null)
        return appendEa([ encodeWord(baseReg | ((reg & 7) << 9) | ((dst.mode & 7) << 3) | (dst.reg & 7)) ], dst);
    imm = parseImmediateOperand(operands[0]);
    if (imm === null)
        throw new Error('Syntax Error');
    parts = [ encodeWord(baseImm | ((dst.mode & 7) << 3) | (dst.reg & 7)), encodeWord(imm & 0xffff) ];
    return appendEa(parts, dst);
}

function encodeSccInstruction(mnemonic, operand) {
    var ea = parseEaOperand(operand, 'b', false);
    return appendEa([ encodeWord(0x50c0 | (encodeConditionMnemonic(mnemonic) << 8) | ((ea.mode & 7) << 3) | (ea.reg & 7)) ], ea);
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
        imm = signed32(parseImmediateOperand(match[1]));
        if (imm < -128 || imm > 127)
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

    match = /^addx\.(b|w|l)\s+(d[0-7])\s*,\s*(d[0-7])$/i.exec(cleaned);
    if (match) {
        srcReg = parseRegister(match[2], 'd');
        dstReg = parseRegister(match[3], 'd');
        sizeCode = { b: 0, w: 1, l: 2 }[match[1].toLowerCase()];
        return encodeWord(0xd100 | (dstReg << 9) | (sizeCode << 6) | srcReg);
    }

    match = /^addx\.(b|w|l)\s+-\((a[0-7])\)\s*,\s*-\((a[0-7])\)$/i.exec(cleaned);
    if (match) {
        srcReg = parseRegister(match[2], 'a');
        dstReg = parseRegister(match[3], 'a');
        sizeCode = { b: 0, w: 1, l: 2 }[match[1].toLowerCase()];
        return encodeWord(0xd108 | (dstReg << 9) | (sizeCode << 6) | srcReg);
    }

    match = /^subx\.(b|w|l)\s+(d[0-7])\s*,\s*(d[0-7])$/i.exec(cleaned);
    if (match) {
        srcReg = parseRegister(match[2], 'd');
        dstReg = parseRegister(match[3], 'd');
        sizeCode = { b: 0, w: 1, l: 2 }[match[1].toLowerCase()];
        return encodeWord(0x9100 | (dstReg << 9) | (sizeCode << 6) | srcReg);
    }

    match = /^subx\.(b|w|l)\s+-\((a[0-7])\)\s*,\s*-\((a[0-7])\)$/i.exec(cleaned);
    if (match) {
        srcReg = parseRegister(match[2], 'a');
        dstReg = parseRegister(match[3], 'a');
        sizeCode = { b: 0, w: 1, l: 2 }[match[1].toLowerCase()];
        return encodeWord(0x9108 | (dstReg << 9) | (sizeCode << 6) | srcReg);
    }

    match = /^(abcd|sbcd)\s+(d[0-7])\s*,\s*(d[0-7])$/i.exec(cleaned);
    if (match) {
        srcReg = parseRegister(match[2], 'd');
        dstReg = parseRegister(match[3], 'd');
        return encodeWord((match[1].toLowerCase() === 'sbcd' ? 0x8100 : 0xc100) | (dstReg << 9) | srcReg);
    }

    match = /^(abcd|sbcd)\s+-\((a[0-7])\)\s*,\s*-\((a[0-7])\)$/i.exec(cleaned);
    if (match) {
        srcReg = parseRegister(match[2], 'a');
        dstReg = parseRegister(match[3], 'a');
        return encodeWord((match[1].toLowerCase() === 'sbcd' ? 0x8108 : 0xc108) | (dstReg << 9) | srcReg);
    }

    match = /^nbcd\s+(d[0-7])$/i.exec(cleaned);
    if (match) {
        reg = parseRegister(match[1], 'd');
        return encodeWord(0x4800 | reg);
    }

    match = /^(jsr|jmp)\s+\((0x[0-9a-f]+)\)\.l$/i.exec(cleaned);
    if (match) {
        target = parseAddressLiteral(match[2]);
        return concatBytes([
            encodeWord((match[1].toLowerCase() === 'jsr' ? 0x4eb9 : 0x4ef9)),
            encodeLong(target)
        ]);
    }

    match = /^([a-z]+)(?:\.(b|w|l))?(?:\s+(.*))?$/i.exec(cleaned);
    if (!match)
        return null;
    operands = splitOperands(match[3] || '');
    switch (match[1].toLowerCase()) {
        case 'move':
        case 'movea':
            if (operands.length === 2)
                return encodeMoveSpecial(cleaned, match[1].toLowerCase(), (match[2] || '').toLowerCase(), operands);
            break;
        case 'addi':
        case 'andi':
        case 'cmpi':
        case 'eori':
        case 'ori':
        case 'subi':
            if (operands.length === 2)
                return encodeImmediateInstruction(match[1].toLowerCase(), (match[2] || 'w').toLowerCase(), operands[0], operands[1]);
            break;
        case 'addq':
        case 'subq':
            if (operands.length === 2)
                return encodeQuickInstruction(match[1].toLowerCase(), (match[2] || 'w').toLowerCase(), operands[0], operands[1]);
            break;
        case 'add':
        case 'sub':
        case 'and':
        case 'or':
        case 'eor':
        case 'cmp':
            if (operands.length === 2)
                return encodeAddSubLogic(match[1].toLowerCase(), (match[2] || 'w').toLowerCase(), operands[0], operands[1]);
            break;
        case 'cmpm':
            if (operands.length === 2 && /^\(a[0-7]\)\+$/i.test(operands[0]) && /^\(a[0-7]\)\+$/i.test(operands[1])) {
                var cmpmSrc = parseRegister(operands[0].replace(/[()+-]/g, ''), 'a');
                var cmpmDst = parseRegister(operands[1].replace(/[()+-]/g, ''), 'a');
                var cmpmSize = { b: 0, w: 1, l: 2 }[(match[2] || 'w').toLowerCase()];
                return encodeWord(0xb108 | ((cmpmDst & 7) << 9) | (cmpmSize << 6) | (cmpmSrc & 7));
            }
            break;
        case 'adda':
            if (operands.length === 2) {
                var addaSize = (match[2] || 'w').toLowerCase();
                var addaDst = parseRegister(operands[1], 'a');
                var addaSrc = parseEaOperand(operands[0], addaSize, true);
                return appendEa([ encodeWord((addaSize === 'l' ? 0xd1c0 : 0xd0c0) | ((addaDst & 7) << 9) | ((addaSrc.mode & 7) << 3) | (addaSrc.reg & 7)) ], addaSrc);
            }
            break;
        case 'suba':
            if (operands.length === 2) {
                var subaSize = (match[2] || 'w').toLowerCase();
                var subaDst = parseRegister(operands[1], 'a');
                var subaSrc = parseEaOperand(operands[0], subaSize, true);
                return appendEa([ encodeWord((subaSize === 'l' ? 0x91c0 : 0x90c0) | ((subaDst & 7) << 9) | ((subaSrc.mode & 7) << 3) | (subaSrc.reg & 7)) ], subaSrc);
            }
            break;
        case 'cmpa':
            if (operands.length === 2) {
                var cmpaSize = (match[2] || 'w').toLowerCase();
                var cmpaDst = parseRegister(operands[1], 'a');
                var cmpaSrc = parseEaOperand(operands[0], cmpaSize, true);
                return appendEa([ encodeWord((cmpaSize === 'l' ? 0xb1c0 : 0xb0c0) | ((cmpaDst & 7) << 9) | ((cmpaSrc.mode & 7) << 3) | (cmpaSrc.reg & 7)) ], cmpaSrc);
            }
            break;
        case 'chk':
        case 'divu':
        case 'divs':
        case 'mulu':
        case 'muls':
            if (operands.length === 2)
                return encodeChkMulDiv(match[1].toLowerCase(), operands[0], operands[1]);
            break;
        case 'nbcd':
            return encodeUnaryEa({ b: 0x4800 }, 'b', operands[0]);
        case 'clr':
            return encodeUnaryEa({ b: 0x4200, w: 0x4240, l: 0x4280 }, (match[2] || 'w').toLowerCase(), operands[0]);
        case 'negx':
            return encodeUnaryEa({ b: 0x4000, w: 0x4040, l: 0x4080 }, (match[2] || 'w').toLowerCase(), operands[0]);
        case 'neg':
            return encodeUnaryEa({ b: 0x4400, w: 0x4440, l: 0x4480 }, (match[2] || 'w').toLowerCase(), operands[0]);
        case 'not':
            return encodeUnaryEa({ b: 0x4600, w: 0x4640, l: 0x4680 }, (match[2] || 'w').toLowerCase(), operands[0]);
        case 'tst':
            return encodeUnaryEa({ b: 0x4a00, w: 0x4a40, l: 0x4a80 }, (match[2] || 'w').toLowerCase(), operands[0]);
        case 'tas':
            var tasEa = parseEaOperand(operands[0], 'b', false);
            return appendEa([ encodeWord(0x4ac0 | ((tasEa.mode & 7) << 3) | (tasEa.reg & 7)) ], tasEa);
        case 'lea':
            var leaReg = parseRegister(operands[1], 'a');
            if (leaReg !== null && isLabelName(operands[0])) {
                var leaLabelValue = symbolValue(operands[0]);
                if (leaLabelValue === null)
                    leaLabelValue = 0;
                return concatBytes([
                    encodeWord(0x41fa | ((leaReg & 7) << 9)),
                    encodeWord((leaLabelValue - ((address + 2) >>> 0)) & 0xffff)
                ]);
            }
            var leaEa = parseEaOperand(operands[0], 'l', false);
            return appendEa([ encodeWord(0x41c0 | ((leaReg & 7) << 9) | ((leaEa.mode & 7) << 3) | (leaEa.reg & 7)) ], leaEa);
        case 'pea':
            var peaEa = parseEaOperand(operands[0], 'l', false);
            return appendEa([ encodeWord(0x4840 | ((peaEa.mode & 7) << 3) | (peaEa.reg & 7)) ], peaEa);
        case 'jsr':
        case 'jmp':
            var jumpEa = parseEaOperand(operands[0], 'l', false);
            return appendEa([ encodeWord((match[1].toLowerCase() === 'jsr' ? 0x4e80 : 0x4ec0) | ((jumpEa.mode & 7) << 3) | (jumpEa.reg & 7)) ], jumpEa);
        case 'swap':
            reg = parseRegister(operands[0], 'd');
            if (reg !== null)
                return encodeWord(0x4840 | reg);
            break;
        case 'ext':
            reg = parseRegister(operands[0], 'd');
            if (reg !== null)
                return encodeWord(((match[2] || 'w').toLowerCase() === 'l' ? 0x48c0 : 0x4880) | reg);
            break;
        case 'link':
            reg = parseRegister(operands[0], 'a');
            imm = parseImmediateOperand(operands[1]);
            if (reg !== null && imm !== null)
                return concatBytes([ encodeWord(0x4e50 | reg), encodeWord(imm & 0xffff) ]);
            break;
        case 'unlk':
            reg = parseRegister(operands[0], 'a');
            if (reg !== null)
                return encodeWord(0x4e58 | reg);
            break;
        case 'stop':
            imm = parseImmediateOperand(operands[0]);
            if (imm !== null)
                return concatBytes([ encodeWord(0x4e72), encodeWord(imm & 0xffff) ]);
            break;
        case 'reset':
            return encodeWord(0x4e70);
        case 'rte':
            return encodeWord(0x4e73);
        case 'rtr':
            return encodeWord(0x4e77);
        case 'illegal':
            return encodeWord(0x4afc);
        case 'trapv':
            return encodeWord(0x4e76);
        case 'movep':
            if (operands.length === 2) {
                var left = parseRegister(operands[0], 'd');
                var right = parseRegister(operands[1], 'd');
                var memOperand = left !== null ? operands[1] : operands[0];
                var mem = String(memOperand).trim().toLowerCase();
                var dispMatch = /^\(([^,]+),(a[0-7])\)$/i.exec(mem);
                var addrReg;
                var dispValue;
                if (!dispMatch)
                    throw new Error('Syntax Error');
                addrReg = parseRegister(dispMatch[2], 'a');
                dispValue = parseImmediateLiteral(dispMatch[1]);
                if (left !== null)
                    return concatBytes([ encodeWord(0x0188 | (left << 9) | (((match[2] || 'w').toLowerCase() === 'l' ? 7 : 6) << 6) | addrReg), encodeWord(dispValue & 0xffff) ]);
                if (right !== null)
                    return concatBytes([ encodeWord(0x0108 | (right << 9) | (((match[2] || 'w').toLowerCase() === 'l' ? 5 : 4) << 6) | addrReg), encodeWord(dispValue & 0xffff) ]);
            }
            break;
        case 'movem':
            if (operands.length === 2) {
                var maskIsSrc = isRegisterMaskOperand(operands[0]);
                var mask = parseRegisterMask(maskIsSrc ? operands[0] : operands[1]);
                var movemEa = parseEaOperand(maskIsSrc ? operands[1] : operands[0], (match[2] || 'w').toLowerCase(), false);
                var movemWord = 0x4880 | ((match[2] || 'w').toLowerCase() === 'l' ? 0x0040 : 0x0000) | (maskIsSrc ? 0x0000 : 0x0400) | ((movemEa.mode & 7) << 3) | (movemEa.reg & 7);
                return concatBytes([ encodeWord(movemWord), encodeWord(mask & 0xffff), encodeWords(movemEa.extWords) ]);
            }
            break;
        case 'exg':
            if (operands.length === 2) {
                var d1 = parseRegister(operands[0], 'd');
                var d2 = parseRegister(operands[1], 'd');
                var a1 = parseRegister(operands[0], 'a');
                var a2 = parseRegister(operands[1], 'a');
                if (d1 !== null && d2 !== null)
                    return encodeWord(0xc140 | (d1 << 9) | d2);
                if (a1 !== null && a2 !== null)
                    return encodeWord(0xc148 | (a1 << 9) | a2);
                if (d1 !== null && a2 !== null)
                    return encodeWord(0xc188 | (d1 << 9) | a2);
                if (a1 !== null && d2 !== null)
                    return encodeWord(0xc188 | (d2 << 9) | a1);
            }
            break;
        case 'asl':
        case 'asr':
        case 'lsl':
        case 'lsr':
        case 'rol':
        case 'ror':
        case 'roxl':
        case 'roxr':
            return encodeShiftRotateInstruction(match[1].toLowerCase(), (match[2] || '').toLowerCase(), operands);
        case 'bchg':
        case 'bclr':
        case 'bset':
        case 'btst':
            return encodeBitInstruction(match[1].toLowerCase(), operands);
        case 'scc':
        case 'scs':
        case 'seq':
        case 'sf':
        case 'sge':
        case 'sgt':
        case 'shi':
        case 'sle':
        case 'sls':
        case 'slt':
        case 'smi':
        case 'sne':
        case 'spl':
        case 'st':
        case 'svc':
        case 'svs':
            return encodeSccInstruction(match[1].toLowerCase(), operands[0]);
    }

    return null;
}

function externalSourceLine(address, line) {
    if (/^monitor$/i.test(cleanLine(line)))
        return '.dc.w 0xa000';
    return normalizeSyntax(branchTargetExpression(address, line));
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
    throw new Error('Illegal Instruction');
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
        match = /^org\s+(.+)$/i.exec(cleaned);
        if (match) {
            entries.push({
                line: cleaned,
                label: '',
                instruction: '',
                directive: 'org',
                expression: match[1].trim()
            });
            firstLine = false;
            continue;
        }
        match = new RegExp('^(' + LABEL_RE + ')\\s+equ\\s+(.+)$', 'i').exec(cleaned);
        if (match) {
            entries.push({
                line: cleaned,
                label: '',
                instruction: '',
                directive: 'equ',
                name: match[1].toLowerCase(),
                expression: match[2].trim()
            });
            firstLine = false;
            continue;
        }
        parsed = parseLabelLine(cleaned);
        entries.push({
            line: cleaned,
            label: parsed.label,
            instruction: parsed.instruction,
            directive: ''
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
    var oldSymbols = currentSymbols;
    currentSymbols = labels;
    try {
        for (i = 0; i < collected.entries.length; ++i) {
            if (collected.entries[i].instruction)
                validateLine(collected.entries[i].instruction);
        }

        for (i = 0; i < collected.entries.length; ++i) {
            var entry = collected.entries[i];
            var resolved;
            var bytes;
            var value;

            if (entry.directive === 'org') {
                value = parseAddressLiteral(entry.expression) >>> 0;
                if (i === 0)
                    collected.baseAddress = value >>> 0;
                pc = value >>> 0;
                continue;
            }

            if (entry.directive === 'equ') {
                if (Object.prototype.hasOwnProperty.call(labels, entry.name))
                    throw new Error('duplicate symbol: ' + entry.name);
                labels[entry.name] = parseImmediateLiteral(entry.expression) >>> 0;
                continue;
            }

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
            var orgValue;

            if (finalEntry.directive === 'org') {
                orgValue = parseAddressLiteral(finalEntry.expression) >>> 0;
                pc = orgValue >>> 0;
                continue;
            }

            if (finalEntry.directive === 'equ')
                continue;

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
    } finally {
        currentSymbols = oldSymbols;
    }
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
