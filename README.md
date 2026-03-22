# j68 Test Computer

A small virtual Motorola 68k test computer built around the `j68` CPU core.

This project is a bring-up machine, not a full Amiga implementation. The focus is:

- reset and vector behavior
- ROM/RAM/MMIO integration
- UART-backed machine-code monitor
- small guest programs loaded from the monitor
- deterministic system tests around exceptions, IRQs, and monitor workflows

Current project shape:

- `src/j68.js`
  - CPU core
- `src/machine/`
  - machine, bus, memory map, devices
- `src/monitor/`
  - monitor shell, tiny assembler/disassembler, commands
- `rom/`
  - monitor and test ROMs
- `source/`
  - monitor-loadable assembly source for `loadasm`
- `save/`
  - compiled binaries and saved monitor artifacts
- `work/programs/`
  - host-assembled standalone 68k programs and guest-side helper libraries
- `test/system/`
  - machine and monitor integration tests

Quick start:

```sh
./runtests.sh
cd test && node runner.js
node tools/monitor.js
```

Typical monitor flow:

```text
list
load 00090000 puthex.bin
g 00090000

source
loadasm 00090000 helloworld.asm
g 00090000
```

Environment:

- `J68_CPU_TYPE`
  - default: `68000`
- `J68_CHIP_RAM_SIZE`
  - default comes from `TestMachine`
- `J68_FAST_RAM_SIZE`
  - default comes from `TestMachine`
- `M68K_AS`
- `M68K_OBJCOPY`

Current stable baseline:

- `./runtests.sh` stays green
- `cd test && node runner.js` stays `231/233`
- `CALLM` and `RTM` remain explicitly deferred
