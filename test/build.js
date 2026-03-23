#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var toolchain = require('../src/tools/m68k_toolchain');

function usage() {
    console.log('usage: node build.js [--rebuild-missing|--rebuild-all] [--clean]');
}

function parseArgs(argv) {
    var args = {
        rebuildMissing: false,
        rebuildAll: false,
        clean: false,
        help: false
    };
    argv.forEach(function (arg) {
        switch (arg) {
            case '--rebuild-missing':
                args.rebuildMissing = true;
                break;
            case '--rebuild-all':
            case '--from-source':
                args.rebuildAll = true;
                break;
            case '--clean':
                args.clean = true;
                break;
            case '--help':
            case '-h':
                args.help = true;
                break;
            default:
                throw new Error('unknown argument: ' + arg);
        }
    });
    if (!args.rebuildMissing && !args.rebuildAll)
        args.rebuildMissing = true;
    return args;
}

function sourceFiles(sourceDir) {
    return fs.readdirSync(sourceDir)
        .filter(function (name) { return /\.s$/i.test(name); })
        .sort();
}

function writeTestList(listFile, outputs) {
    var body = '{ "tests": [\n' + outputs.map(function (test, index) {
        var prefix = index === 0 ? '' : ',';
        return prefix + '"' + test.replace(/\\/g, '/') + '"';
    }).join('\n') + '\n] }\n';
    fs.writeFileSync(listFile, body);
}

function cleanOutputs(outDir, listFile) {
    if (fs.existsSync(outDir)) {
        fs.readdirSync(outDir).forEach(function (name) {
            if (/\.(r|o)$/i.test(name))
                fs.rmSync(path.join(outDir, name), { force: true });
        });
    }
    fs.rmSync(listFile, { force: true });
}

function main() {
    var args = parseArgs(process.argv.slice(2));
    var root = __dirname;
    var sourceDir = path.join(root, 'asm');
    var outDir = path.join(root, 'r');
    var listFile = path.join(root, 'test.list');
    var built = 0;
    var skipped = 0;
    var outputs;

    if (args.help) {
        usage();
        return;
    }

    fs.mkdirSync(outDir, { recursive: true });
    if (args.clean)
        cleanOutputs(outDir, listFile);

    outputs = sourceFiles(sourceDir).map(function (sourceName) {
        var sourceFile = path.join(sourceDir, sourceName);
        var outputName = sourceName.replace(/\.s$/i, '.r');
        var outputFile = path.join(outDir, outputName);
        var shouldBuild = args.rebuildAll || !fs.existsSync(outputFile);

        if (shouldBuild) {
            console.log('build ' + path.relative(root, sourceFile));
            toolchain.buildBinaryFile(
                sourceFile,
                outputFile,
                null,
                'm68k assembler/objcopy are required for CPU test builds',
                { omitCpuFlag: true }
            );
            built += 1;
        } else {
            skipped += 1;
        }
        return path.join('r', outputName);
    });

    writeTestList(listFile, outputs);
    console.log('wrote ' + path.relative(root, listFile));
    console.log('built=' + built + ' skipped=' + skipped);
}

try {
    main();
} catch (error) {
    var message = error && error.message ? error.message : String(error);
    if (/operands mismatch/i.test(message)) {
        console.error(message);
        console.error('CPU test source rebuild requires an assembler compatible with the current test/asm syntax.');
        console.error('This host can still run cached test/r/*.r artefacts.');
        console.error('Use cached mode, or install/use a compatible assembler via M68K_AS and M68K_OBJCOPY.');
    } else {
        console.error(message);
    }
    process.exit(1);
}
