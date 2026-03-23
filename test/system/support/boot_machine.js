var path = require('path');
var TestMachine = require('../../../src/machine/test_machine');
var Uart = require('../../../src/machine/devices/uart');
var Intc = require('../../../src/machine/devices/intc');
var Timer = require('../../../src/machine/devices/timer');
var assemble = require('./assemble_m68k');

var cpuType = process.env.J68_CPU_TYPE || '68000';

function defaultSize(name, fallback) {
    if (!process.env[name])
        return fallback >>> 0;
    return parseInt(process.env[name], 0) >>> 0;
}

function bootMachine(options) {
    options = options || {};
    var rom = options.rom || assemble.assembleToBinary(
        path.join(__dirname, '../../..', 'rom', options.romName || 'monitor.S'),
        options.cpuType || cpuType,
        { fromSource: !!options.fromSource }
    );
    var machine = new TestMachine({
        rom: rom,
        chipRamSize: options.chipRamSize === undefined ? defaultSize('J68_CHIP_RAM_SIZE', 0x00200000) : options.chipRamSize,
        fastRamSize: options.fastRamSize === undefined ? defaultSize('J68_FAST_RAM_SIZE', 0x00400000) : options.fastRamSize,
        overlay: options.overlay === undefined ? true : !!options.overlay,
        cpuType: options.cpuType || cpuType
    });
    var state = {
        machine: machine,
        uart: null,
        intc: null,
        timer: null
    };

    if (options.uart !== false) {
        state.uart = new Uart(options.uartOptions);
        machine.mapDevice(state.uart);
    }

    if (options.intc) {
        state.intc = new Intc(options.intcOptions);
        machine.attachIntc(state.intc);
    }

    if (options.timer) {
        state.timer = new Timer(Object.assign({
            irqLevel: 2,
            defaultReload: 0x1000
        }, options.timerOptions || {}));
        machine.attachTimer(state.timer);
    }

    if (options.monitor && state.uart)
        machine.attachMonitor(state.uart);

    machine.reset();
    machine.runBlocks(options.bootBlocks === undefined ? 1 : options.bootBlocks);
    return state;
}

function bootMonitorMachine(options) {
    return bootMachine(Object.assign({
        romName: 'monitor.S',
        monitor: true,
        uart: true
    }, options || {}));
}

function bootMonitorWithTimer(options) {
    var merged = Object.assign({
        romName: 'monitor.S',
        monitor: true,
        uart: true,
        intc: true,
        timer: true
    }, options || {});
    merged.timerOptions = Object.assign({
        irqLevel: 2,
        defaultReload: 0x1000
    }, (options && options.timerOptions) || {});
    return bootMachine(merged);
}

module.exports = {
    bootMachine: bootMachine,
    bootMonitorMachine: bootMonitorMachine,
    bootMonitorWithTimer: bootMonitorWithTimer,
    cpuType: cpuType
};
