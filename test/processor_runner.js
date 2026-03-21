#!/usr/bin/env node
// ProcessorTests runner for j68k
// Runs tests from /home/smalley/reference/ProcessorTests/680x0/68000/v1/

var fs = require('fs');
var path = require('path');
var j68 = require('../src/j68');

var TEST_DIR = '/home/smalley/reference/ProcessorTests/680x0/68000/v1';

function loadTest(file) {
    var content = fs.readFileSync(file);
    // Handle gzip files
    if (file.endsWith('.gz')) {
        var zlib = require('zlib');
        content = zlib.gunzipSync(content);
    }
    return JSON.parse(content.toString());
}

function runTest(testCase, cpu) {
    var initial = testCase.initial;
    var final = testCase.final;
    
    // Initialize CPU state
    for (var i = 0; i < 8; i++) {
        cpu.context.d[i] = initial['d' + i] >>> 0;
        cpu.context.a[i] = initial['a' + i] >>> 0;
    }
    cpu.context.usp = initial.usp >>> 0;
    cpu.context.sr = initial.sr >>> 0;
    cpu.context.pc = initial.pc >>> 0;
    
    // Load RAM
    if (initial.ram) {
        for (var i = 0; i < initial.ram.length; i++) {
            var [addr, val] = initial.ram[i];
            cpu.context.s8(addr >>> 0, val);
        }
    }
    
    // Load prefetch (instruction words)
    if (initial.prefetch) {
        for (var i = 0; i < initial.prefetch.length; i++) {
            cpu.context.s16(cpu.context.pc + i * 2, initial.prefetch[i]);
        }
    }
    
    // Run single instruction
    cpu.context.halt = false;
    cpu.run();
    
    // Check results
    var passed = true;
    var errors = [];
    
    // Check registers
    for (var i = 0; i < 8; i++) {
        var exp = final['d' + i];
        var got = cpu.context.d[i];
        if (exp !== undefined && (got >>> 0) !== (exp >>> 0)) {
            passed = false;
            errors.push('D' + i + ': expected ' + exp + ' got ' + got);
        }
    }
    for (var i = 0; i < 8; i++) {
        var exp = final['a' + i];
        var got = cpu.context.a[i];
        if (exp !== undefined && (got >>> 0) !== (exp >>> 0)) {
            passed = false;
            errors.push('A' + i + ': expected ' + exp + ' got ' + got);
        }
    }
    
    // Check SR
    if (final.sr !== undefined && cpu.context.sr !== final.sr) {
        passed = false;
        errors.push('SR: expected ' + final.sr + ' got ' + cpu.context.sr);
    }
    
    // Check PC
    if (final.pc !== undefined && cpu.context.pc !== final.pc) {
        passed = false;
        errors.push('PC: expected ' + final.pc + ' got ' + cpu.context.pc);
    }
    
    // Check RAM
    if (final.ram) {
        for (var i = 0; i < final.ram.length; i++) {
            var [addr, exp] = final.ram[i];
            var got = cpu.context.l8(addr >>> 0);
            if (got !== exp) {
                passed = false;
                errors.push('RAM[' + addr + ']: expected ' + exp + ' got ' + got);
            }
        }
    }
    
    return { passed: passed, errors: errors };
}

function runTestFile(file) {
    console.log('Testing: ' + path.basename(file));
    var tests = loadTest(file);
    var passed = 0;
    var failed = 0;
    var errors = [];
    
    var cpu = new j68.j68();
    cpu.logJit = false;
    cpu.logOpt = false;
    cpu.logDecode = false;
    
    // Run first 100 tests (or all if fewer)
    var maxTests = Math.min(tests.length, 100);
    for (var i = 0; i < maxTests; i++) {
        var result = runTest(tests[i], cpu);
        if (result.passed) {
            passed++;
        } else {
            failed++;
            if (errors.length < 5) {
                errors.push({
                    test: tests[i].name,
                    errors: result.errors
                });
            }
        }
    }
    
    console.log('  Passed: ' + passed + '/' + maxTests);
    if (failed > 0) {
        console.log('  Failed: ' + failed);
        errors.forEach(function(e) {
            console.log('    ' + e.test + ': ' + e.errors.slice(0, 2).join(', '));
        });
    }
    
    return { passed: passed, failed: failed, total: maxTests };
}

// Main
var files = fs.readdirSync(TEST_DIR).filter(function(f) {
    return f.endsWith('.json') || f.endsWith('.json.gz');
});

console.log('ProcessorTests 68000 Runner');
console.log('===========================\n');

var totalPassed = 0;
var totalFailed = 0;
var totalTests = 0;

files.forEach(function(file) {
    var result = runTestFile(path.join(TEST_DIR, file));
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalTests += result.total;
});

console.log('\n===========================');
console.log('Total: ' + totalPassed + '/' + totalTests + ' passed');
if (totalFailed > 0) {
    console.log('Failed: ' + totalFailed);
    process.exit(1);
}
