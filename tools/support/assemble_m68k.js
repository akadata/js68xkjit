var toolchain = require('../../src/tools/m68k_toolchain');

function assembleToBinary(sourceFile, cpuType) {
    return toolchain.assembleToBinary(
        sourceFile,
        cpuType || process.env.J68_CPU_TYPE || '68000',
        'm68k assembler/objcopy are required for ROM assembly tests'
    );
}

module.exports = {
    assembleToBinary: assembleToBinary
};
