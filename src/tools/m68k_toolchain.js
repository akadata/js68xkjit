var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');

function tool(name) {
    try {
        if (name.indexOf('/') !== -1) {
            fs.accessSync(name, fs.constants.X_OK);
            return name;
        }
        return childProcess.execFileSync('bash', [ '-lc', 'command -v ' + name ], {
            encoding: 'utf8'
        }).trim();
    } catch (error) {
        return '';
    }
}

function firstTool(candidates) {
    for (var i = 0; i < candidates.length; ++i) {
        var found = tool(candidates[i]);
        if (found)
            return found;
    }
    return '';
}

function candidateAssemblers() {
    return [
        'm68k-linux-gnu-as',
        'm68k-elf-as',
        'm68k-amigaos-as',
        '/opt/amiga/bin/m68k-amigaos-as'
    ];
}

function candidateObjcopy() {
    return [
        'm68k-linux-gnu-objcopy',
        'm68k-elf-objcopy',
        'm68k-amigaos-objcopy',
        '/opt/amiga/bin/m68k-amigaos-objcopy'
    ];
}

function resolveToolchain() {
    return {
        assembler: process.env.M68K_AS || firstTool(candidateAssemblers()),
        objcopy: process.env.M68K_OBJCOPY || firstTool(candidateObjcopy())
    };
}

function asFlagForCpu(cpuType) {
    switch (String(cpuType || '68000').toLowerCase()) {
        case '68000':
        case 'mc68000':
            return '-m68000';
        case '68010':
        case 'mc68010':
            return '-m68010';
        case '68020':
        case 'mc68020':
            return '-m68020';
        case '68030':
        case 'mc68030':
            return '-m68030';
        case '68040':
        case 'mc68040':
            return '-m68040';
    }
    throw new Error('unsupported cpuType: ' + cpuType);
}

function summarizeExecError(error) {
    var stderr = String((error && error.stderr) || '').split('\n').filter(Boolean);
    if (stderr.length === 0)
        return error && error.message ? error.message : 'assembler failed';
    return stderr[stderr.length - 1].replace(/^.*Error:\s*/, '');
}

function ensureToolchain(errorMessage) {
    var resolved = resolveToolchain();
    if (!resolved.assembler || !resolved.objcopy)
        throw new Error(errorMessage || 'm68k assembler/objcopy are required');
    return resolved;
}

function assembleToBinary(sourceFile, cpuType, errorMessage) {
    var toolchain = ensureToolchain(errorMessage);
    var tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'j68-rom-'));
    var objectFile = path.join(tempDir, 'out.o');
    var binaryFile = path.join(tempDir, 'out.bin');

    try {
        childProcess.execFileSync(toolchain.assembler, [ asFlagForCpu(cpuType), '-o', objectFile, sourceFile ], { stdio: 'pipe' });
    } catch (error) {
        throw new Error(summarizeExecError(error));
    }
    childProcess.execFileSync(toolchain.objcopy, [ '-O', 'binary', objectFile, binaryFile ], { stdio: 'pipe' });
    return new Uint8Array(fs.readFileSync(binaryFile));
}

function assembleSourceText(sourceText, cpuType, errorMessage) {
    var tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'j68-asm-'));
    var sourceFile = path.join(tempDir, 'line.s');
    fs.writeFileSync(sourceFile, sourceText);
    return assembleToBinary(sourceFile, cpuType, errorMessage);
}

module.exports = {
    asFlagForCpu: asFlagForCpu,
    assembleSourceText: assembleSourceText,
    assembleToBinary: assembleToBinary,
    resolveToolchain: resolveToolchain,
    summarizeExecError: summarizeExecError,
    tool: tool
};
