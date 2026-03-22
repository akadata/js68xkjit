#!/usr/bin/env node

var path = require('path');
var TestMachine = require('../src/machine/test_machine');
var Uart = require('../src/machine/devices/uart');
var Intc = require('../src/machine/devices/intc');
var Timer = require('../src/machine/devices/timer');
var assemble = require('./support/assemble_m68k');
var monitorCommands = require('../src/monitor/commands');

function decodeScript(text) {
    return String(text || '')
        .replace(/\\r/g, '\r')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t');
}

function buildMachine() {
    var rom = assemble.assembleToBinary(path.join(__dirname, '../rom/monitor.S'));
    var machine = new TestMachine({
        rom: rom,
        chipRamSize: 0x00200000,
        fastRamSize: 0x00400000,
        overlay: true,
        cpuType: '68000'
    });
    var uart = new Uart();
    var intc = new Intc();
    var timer = new Timer({ irqLevel: 2, defaultReload: 1000 });

    machine.mapDevice(uart);
    machine.attachIntc(intc);
    machine.attachTimer(timer);
    machine.attachMonitor(uart);
    machine.reset();

    return {
        machine: machine,
        uart: uart
    };
}

function main() {
    var state = buildMachine();
    var machine = state.machine;
    var uart = state.uart;
    var script = decodeScript(process.env.J68_MONITOR_SCRIPT || '');
    var exitOnMonitor = process.env.J68_MONITOR_EXIT_ON_MONITOR === '1';
    var settledMonitorTicks = 0;

    function flushOutput() {
        var text = uart.consumeTxString();
        if (text !== '')
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
    process.stdin.resume();
    process.stdin.on('data', function (chunk) {
        for (var i = 0; i < chunk.length; ++i) {
            if (chunk.charCodeAt(i) === 3)
                shutdown(0);
        }
        uart.enqueueRxString(chunk);
    });

    process.on('SIGINT', function () {
        shutdown(0);
    });

    var loop = setInterval(function () {
        if (machine.monitor && machine.monitor.active)
            machine.pollMonitor();
        else
            machine.runBlocks(1000);

        if (machine.lastFault && machine.monitor && !machine.monitor.active) {
            uart.writeString(monitorCommands.formatFault(machine) + '\n');
            machine.monitor.enter();
            machine.clearFault();
        }

        flushOutput();

        if (exitOnMonitor && machine.monitor && machine.monitor.active && uart.rx.length === 0) {
            settledMonitorTicks += 1;
            if (settledMonitorTicks >= 3)
                shutdown(0);
        } else {
            settledMonitorTicks = 0;
        }
    }, 10);
}

main();
