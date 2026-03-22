var fs = require('fs');
var os = require('os');
var path = require('path');
var childProcess = require('child_process');

var ALLOWED = {
    nop: true,
    monitor: true,
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

function tool(name) {
    try {
        return childProcess.execFileSync('bash', [ '-lc', 'command -v ' + name ], { encoding: 'utf8' }).trim();
    } catch (error) {
        return '';
    }
}

function hex(value, width) {
    return (Array(width + 1).join('0') + ((value >>> 0).toString(16).toUpperCase())).slice(-width);
}

function cleanLine(line) {
    return String(line || '').replace(/;.*/, '').trim();
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
    if (!ALLOWED[mnemonic])
        throw new Error('unsupported mnemonic: ' + mnemonic);
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

function assembleSource(address, line) {
    var assembler = tool('m68k-linux-gnu-as');
    var objcopy = tool('m68k-linux-gnu-objcopy');
    var tempDir;
    var sourceFile;
    var objectFile;
    var binaryFile;
    var source;

    if (!assembler || !objcopy)
        throw new Error('m68k-linux-gnu-as/objcopy are required');

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'j68-asm-'));
    sourceFile = path.join(tempDir, 'line.s');
    objectFile = path.join(tempDir, 'line.o');
    binaryFile = path.join(tempDir, 'line.bin');

    source = '    .text\n' +
        normalizeSyntax(branchTargetExpression(address, line)) + '\n';

    fs.writeFileSync(sourceFile, source);
    try {
        childProcess.execFileSync(assembler, [ '-m68000', '-o', objectFile, sourceFile ], { stdio: 'pipe' });
    } catch (error) {
        var stderr = String(error.stderr || '').split('\n').filter(Boolean);
        var summary = stderr.length === 0 ? error.message : stderr[stderr.length - 1];
        throw new Error(summary.replace(/^.*Error:\s*/, ''));
    }
    childProcess.execFileSync(objcopy, [ '-O', 'binary', objectFile, binaryFile ], { stdio: 'pipe' });
    return new Uint8Array(fs.readFileSync(binaryFile));
}

function assembleLine(address, line) {
    var cleaned = cleanLine(line);
    if (cleaned === '')
        return null;
    validateLine(cleaned);
    if (mnemonicOf(cleaned) === 'monitor')
        return Uint8Array.from([ 0xa0, 0x00 ]);
    return assembleSource(address >>> 0, cleaned);
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
    cleanLine: cleanLine
};
