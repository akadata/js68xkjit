var toolchain = require('../../src/tools/m68k_toolchain');

function normalizeArgs(cpuTypeOrOptions, maybeOptions) {
    var options;
    var cpuType;

    if (cpuTypeOrOptions && typeof cpuTypeOrOptions === 'object') {
        options = Object.assign({}, cpuTypeOrOptions);
        cpuType = options.cpuType || process.env.J68_CPU_TYPE || '68000';
    } else {
        cpuType = cpuTypeOrOptions || process.env.J68_CPU_TYPE || '68000';
        options = Object.assign({}, maybeOptions || {});
    }
    if (options.fromSource === undefined) {
        options.fromSource = process.env.J68_FROM_SOURCE === '1';
    }
    return {
        cpuType: cpuType,
        options: options
    };
}

function assembleToBinary(sourceFile, cpuTypeOrOptions, maybeOptions) {
    var normalized = normalizeArgs(cpuTypeOrOptions, maybeOptions);
    return toolchain.assembleToBinaryCached(
        sourceFile,
        normalized.cpuType,
        {
            forceRebuild: !!normalized.options.fromSource
        },
        'm68k assembler/objcopy are required for ROM assembly tests'
    );
}

function cleanGenerated() {
    toolchain.cleanGenerated();
}

module.exports = {
    assembleToBinary: assembleToBinary,
    cleanGenerated: cleanGenerated
};
