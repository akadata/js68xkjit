var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');

var rebuiltInProcess = {};

function repoRoot() {
    return path.resolve(__dirname, '..', '..');
}

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
        if (found) {
            return found;
        }
    }
    return '';
}

var toolPrefixes = [
    'm68k-amigaos',
    'm68k-none-elf',
    'm68k-unknown-elf',
    'm68k-linux-gnu',
    'm68k-elf'
];

function candidateToolchains(tool) {
    return toolPrefixes.map(function (prefix) {
        return prefix + '-' + tool;
    });
}

function resolveToolchain() {
    return {
        assembler: process.env.M68K_AS || firstTool(candidateToolchains('as')),
        objcopy: process.env.M68K_OBJCOPY || firstTool(candidateToolchains('objcopy'))
    };
}

function resolvedToolchainCandidates() {
    var seen = {};
    var list = [];
    var envAssembler = process.env.M68K_AS || '';
    var envObjcopy = process.env.M68K_OBJCOPY || '';
    var resolvedDefault = resolveToolchain();

    function pushCandidate(assemblerName, objcopyName) {
        var assembler = assemblerName ? tool(assemblerName) : '';
        var objcopy = objcopyName ? tool(objcopyName) : '';
        var key;

        if (!assembler || !objcopy) {
            return;
        }
        key = assembler + '|' + objcopy;
        if (seen[key]) {
            return;
        }
        seen[key] = true;
        list.push({
            assembler: assembler,
            objcopy: objcopy
        });
    }

    if (envAssembler || envObjcopy) {
        pushCandidate(envAssembler || resolvedDefault.assembler, envObjcopy || resolvedDefault.objcopy);
        return list;
    }

    candidateToolchains().forEach(function (entry) {
        pushCandidate(entry.assembler, entry.objcopy);
    });
    pushCandidate(resolvedDefault.assembler, resolvedDefault.objcopy);
    return list;
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
    if (stderr.length === 0) {
        return error && error.message ? error.message : 'assembler failed';
    }
    return stderr[stderr.length - 1].replace(/^.*Error:\s*/, '');
}

function ensureToolchain(errorMessage) {
    var resolved = resolveToolchain();
    if (!resolved.assembler || !resolved.objcopy) {
        throw new Error(errorMessage || 'm68k assembler/objcopy are required');
    }
    return resolved;
}

function ensureDirectory(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function generatedRoot() {
    return path.join(repoRoot(), 'build', 'generated', 'm68k');
}

function normalizedRelativeSource(sourceFile) {
    var sourcePath = path.resolve(sourceFile);
    var relative = path.relative(repoRoot(), sourcePath);
    if (relative.indexOf('..') === 0) {
        relative = path.basename(sourcePath);
    }
    return relative.replace(/\\/g, '/');
}

function generatedBinaryPath(sourceFile, cpuType, options) {
    options = options || {};
    var bucket = options.omitCpuFlag ? 'generic' : String(cpuType || '68000').toLowerCase();
    var relative = normalizedRelativeSource(sourceFile).replace(/\.[^.]+$/, '.bin');
    return path.join(generatedRoot(), bucket, relative);
}

function buildKey(sourceFile, cpuType, options, outputFile) {
    return [
        path.resolve(sourceFile),
        options && options.omitCpuFlag ? 'generic' : String(cpuType || '68000').toLowerCase(),
        path.resolve(outputFile)
    ].join('|');
}

function buildBinaryFile(sourceFile, binaryFile, cpuType, errorMessage, options) {
    var tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'j68-asm-'));
    var objectFile = path.join(tempDir, 'out.o');
    var args = [];
    var candidates = resolvedToolchainCandidates();
    var lastError = null;
    var attempted = [];
    var i;

    options = options || {};
    ensureDirectory(binaryFile);
    if (candidates.length === 0) {
        throw new Error(errorMessage || 'm68k assembler/objcopy are required');
    }
    if (!options.omitCpuFlag) {
        args.push(asFlagForCpu(cpuType));
    }
    args.push('-o', objectFile, path.resolve(sourceFile));

    for (i = 0; i < candidates.length; ++i) {
        try {
            childProcess.execFileSync(candidates[i].assembler, args, { stdio: 'pipe' });
            childProcess.execFileSync(candidates[i].objcopy, [ '-O', 'binary', objectFile, path.resolve(binaryFile) ], { stdio: 'pipe' });
            return binaryFile;
        } catch (error) {
            lastError = error;
            attempted.push(path.basename(candidates[i].assembler));
        }
    }
    throw new Error(
        (errorMessage || 'm68k assembler/objcopy are required') +
        ': tried ' + attempted.join(', ') +
        '; last error: ' + summarizeExecError(lastError)
    );
}

function assembleToBinary(sourceFile, cpuType, errorMessage, options) {
    var tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'j68-rom-'));
    var binaryFile = path.join(tempDir, 'out.bin');
    buildBinaryFile(sourceFile, binaryFile, cpuType, errorMessage, options || {});
    return new Uint8Array(fs.readFileSync(binaryFile));
}

function assembleToBinaryCached(sourceFile, cpuType, options, errorMessage) {
    var binaryFile;
    var key;

    options = options || {};
    binaryFile = options.outputFile || generatedBinaryPath(sourceFile, cpuType, options);
    key = buildKey(sourceFile, cpuType, options, binaryFile);

    if (!options.forceRebuild && fs.existsSync(binaryFile)) {
        return new Uint8Array(fs.readFileSync(binaryFile));
    }
    if (options.forceRebuild && rebuiltInProcess[key] && fs.existsSync(binaryFile)) {
        return new Uint8Array(fs.readFileSync(binaryFile));
    }

    buildBinaryFile(sourceFile, binaryFile, cpuType, errorMessage, options);
    rebuiltInProcess[key] = true;
    return new Uint8Array(fs.readFileSync(binaryFile));
}

function assembleSourceText(sourceText, cpuType, errorMessage, options) {
    var tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'j68-asm-'));
    var sourceFile = path.join(tempDir, 'line.s');
    fs.writeFileSync(sourceFile, sourceText);
    return assembleToBinary(sourceFile, cpuType, errorMessage, options);
}

function cleanGenerated() {
    fs.rmSync(generatedRoot(), { recursive: true, force: true });
}

module.exports = {
    asFlagForCpu: asFlagForCpu,
    assembleSourceText: assembleSourceText,
    assembleToBinary: assembleToBinary,
    assembleToBinaryCached: assembleToBinaryCached,
    buildBinaryFile: buildBinaryFile,
    cleanGenerated: cleanGenerated,
    generatedBinaryPath: generatedBinaryPath,
    resolvedToolchainCandidates: resolvedToolchainCandidates,
    resolveToolchain: resolveToolchain,
    summarizeExecError: summarizeExecError,
    tool: tool
};