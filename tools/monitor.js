#!/usr/bin/env node


var path = require('path');
var TestMachine = require('../src/machine/test_machine');
var Uart = require('../src/machine/devices/uart');
var Intc = require('../src/machine/devices/intc');
var Timer = require('../src/machine/devices/timer');
var assemble = require('./support/assemble_m68k');
var monitorCommands = require('../src/monitor/commands');
var createLineEditor = require('./support/line_editor').createLineEditor;

var cpuType = process.env.J68_CPU_TYPE || '68000';

function parseArgs(argv) {
    var options = {
        fromSource: false,
        cleanGenerated: false
    };

    argv.forEach(function (arg) {
        switch (arg) {
            case '--from-source':
                options.fromSource = true;
                break;
            case '--clean':
            case '--clean-generated':
                options.cleanGenerated = true;
                break;
            default:
                throw new Error('unknown argument: ' + arg);
        }
    });
    return options;
}

function decodeScript(text) {
    return String(text || '')
        .replace(/\\r/g, '\r')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t');
}

function buildMachine(cpuType, options) {
    var rom = assemble.assembleToBinary(path.join(__dirname, '../rom/monitor.S'), cpuType, options || {});
    var machine = new TestMachine({
        rom: rom,
        overlay: true,
        cpuType: cpuType
    });
    var uart = new Uart();
    var intc = new Intc();
    var timer = new Timer({ irqLevel: 2, defaultReload: 1000 });

    machine.mapDevice(uart);
    machine.attachIntc(intc);
    machine.attachTimer(timer);
    machine.attachMonitor(uart);
    machine.asyncMonitorRun = true;
    machine.reset();

    return {
        machine: machine,
        uart: uart
    };
}

function main() {
    var options = parseArgs(process.argv.slice(2));
    var state;
    var machine;
    var uart;
    var script = decodeScript(process.env.J68_MONITOR_SCRIPT || '');
    var exitOnMonitor = process.env.J68_MONITOR_EXIT_ON_MONITOR === '1';
    var settledMonitorTicks = 0;
    var lineEditor = null;
    var lastMonitorActive = false;

    if (options.cleanGenerated)
        assemble.cleanGenerated();
    state = buildMachine(cpuType, options);
    machine = state.machine;
    uart = state.uart;
    lastMonitorActive = !!(machine.monitor && machine.monitor.active);

    function flushOutput() {
        var text = uart.consumeTxString();
        if (text === '')
            return;
        if (lineEditor)
            lineEditor.handleOutput(text);
        else
            process.stdout.write(text);
    }

    function shutdown(code) {
        clearInterval(loop);
        flushOutput();
        if (process.stdin.isTTY)
            process.stdin.setRawMode(false);
        process.stdin.pause();
        process.exit(code);
    }

    if (script)
        uart.enqueueRxString(script);

    process.stdin.setEncoding('latin1');
    if (process.stdin.isTTY)
        process.stdin.setRawMode(true);
    if (process.stdin.isTTY && !script) {
        lineEditor = createLineEditor({
            write: function (text) { process.stdout.write(text); },
            onLine: function (line) { uart.enqueueRxString(line); }
        });
    }
    process.stdin.resume();
    process.stdin.on('data', function (chunk) {
        for (var i = 0; i < chunk.length; ++i) {
            if (chunk.charCodeAt(i) === 3)
                shutdown(0);
        }
        if (lineEditor)
            lineEditor.handleChunk(chunk);
        else
            uart.enqueueRxString(chunk);
    });

    process.on('SIGINT', function () {
        shutdown(0);
    });

    var loop = setInterval(function () {
        if (machine.monitor && machine.monitor.active)
            machine.pollMonitor();
        else if (machine.pendingRun)
            machine.runUntilInstruction(function (m) { return m.cpu.context.halt; }, 1000);
        else
            machine.runBlocks(1000);

        if (machine.pendingRun) {
            var executedInstructions = (machine.cpu.context.i - machine.pendingRun.beforeInstructions) >>> 0;
            if (machine.monitor && machine.monitor.active) {
                machine.pendingRun = null;
            } else if (executedInstructions >= machine.pendingRun.limit) {
                machine.pendingRun = null;
                machine.cpu.context.halt = true;
                uart.writeString('\r\nRUN LIMIT PC=' + monitorCommands.hex(machine.cpu.context.pc, 8) + ' INS=' + executedInstructions + '\n');
                if (machine.monitor)
                    machine.monitor.enter();
            }
        }

        if (machine.lastFault && machine.monitor && !machine.monitor.active) {
            machine.pendingRun = null;
            uart.writeString(monitorCommands.formatFault(machine) + '\n');
            machine.monitor.enter();
            machine.clearFault();
        }

        if (lineEditor && machine.monitor && machine.monitor.active && !lastMonitorActive)
            lineEditor.resetTransientInput();

        flushOutput();
        lastMonitorActive = !!(machine.monitor && machine.monitor.active);

        if (machine.requestExit)
            shutdown(0);

        if (exitOnMonitor && machine.monitor && machine.monitor.active && uart.rx.length === 0) {
            settledMonitorTicks += 1;
            if (settledMonitorTicks >= 3)
                shutdown(0);
        } else {
            settledMonitorTicks = 0;
        }
    }, 10);
}

if (require.main === module)
    main();

module.exports = {
    buildMachine: buildMachine
};
