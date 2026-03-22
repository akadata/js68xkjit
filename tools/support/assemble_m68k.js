var childProcess = require('child_process');
var fs = require('fs');
var os = require('os');
var path = require('path');

function tool(name) {
    try {
        return childProcess.execFileSync('bash', [ '-lc', 'command -v ' + name ], { encoding: 'utf8' }).trim();
    } catch (error) {
        return '';
    }
}

function assembleToBinary(sourceFile) {
    var assembler = tool('m68k-linux-gnu-as');
    var objcopy = tool('m68k-linux-gnu-objcopy');
    if (!assembler || !objcopy)
        throw new Error('m68k-linux-gnu-as/objcopy are required');

    var tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'j68-rom-'));
    var objectFile = path.join(tempDir, 'rom.o');
    var binaryFile = path.join(tempDir, 'rom.bin');

    childProcess.execFileSync(assembler, [ '-m68000', '-o', objectFile, sourceFile ], { stdio: 'pipe' });
    childProcess.execFileSync(objcopy, [ '-O', 'binary', objectFile, binaryFile ], { stdio: 'pipe' });
    return new Uint8Array(fs.readFileSync(binaryFile));
}

module.exports = {
    assembleToBinary: assembleToBinary
};
