# Monitor

## Overview

The ROM monitor is entered automatically after reset.

Current boot flow:

1. reset vector fetch through the ROM overlay at address `0`
2. ROM boot code runs
3. UART prints the banner
4. ROM enters the monitor loop
5. prompt appears as `j68> `

This is a UART-backed machine-code monitor for the j68 test computer. It is not an Amiga monitor and it does not depend on Amiga OS semantics.

## Start The Monitor

Run:

```sh
node tools/monitor.js
```

You should see:

```text
j68
j68>
```

Type commands and press Enter.

Exit with `Ctrl+C`.

Default monitor startup uses a cached generated ROM binary if one already
exists.

Rebuild the monitor ROM from source explicitly with:

```sh
node tools/monitor.js --from-source
```

Clear generated ROM cache first with:

```sh
node tools/monitor.js --clean-generated
```

Generated ROM binaries are stored under `build/generated/m68k/`.

## Number Rules

The monitor uses different numeric conventions depending on context.

- monitor addresses are hexadecimal by default
- raw memory patch/data tokens are hexadecimal by default
- save/load lengths are hexadecimal by default
- assembler immediates in `a <addr>` are decimal by default
- explicit hexadecimal in assembler input can use `$` or `0x`

Examples:

```text
m 00090000=4E 71 A0 00
save 00090000 12 demo.bin
```

The `save` example above saves `0x12` bytes, not decimal `12`.

Assembler examples:

```text
moveq #10,d0
cmpi.w #$0A,d0
movea.l #0x00de0000,a0
```

## Current Commands

### Registers

Show registers:

```text
r
```

Set one register:

```text
r d0=1234
r a0=00de0000
r pc=00090000
r sr=2000
```

Supported register names:

- `d0`-`d7`
- `a0`-`a7`
- `pc`
- `sr`
- `ssp`
- `usp`
- `vbr`

Values are hexadecimal.

### Memory

Dump memory:

```text
m f80000
m 00090000
```

Patch memory bytes:

```text
m 00090000=4E 71 A0 00
m 00090010=1234 5678
m 00090020=203C 0000002A
```

Patch data is interpreted as hex tokens:

- `2` hex digits -> one byte
- `4` hex digits -> one word, stored big-endian
- `8` hex digits -> one longword, stored big-endian

### Disassembly

Disassemble from an address:

```text
u f80008
u 00090000
```

### Execution

Run from an address:

```text
g 00090000
```

Long run from an address with a larger safety budget:

```text
gl 00090000
```

Single-step from the current PC:

```text
t
```

Single-step from a specific address:

```text
t 00090000
```

### Save / Load / Source

Save a memory block to `save/`:

```text
save 00090000 10 hello.bin
```

Save a memory block as monitor source into `source/`:

```text
saveasm 00090000 0E demo.asm
```

List binary/output files in `save/`:

```text
list
```

Load a raw binary file from `save/` into memory:

```text
load 00090000 hello.bin
```

List monitor-loadable assembly source files in `source/`:

```text
source
```

Load monitor assembly source from `source/` into memory:

```text
loadasm 00090000 hello.asm
```

The command split is strict:

- `list` shows non-dot files from `save/`
- `load` reads raw binaries from `save/`
- `source` shows non-dot files from `source/`
- `loadasm` reads text source from `source/`
- `saveasm` writes text source into `source/`

If you try to `load` an `.asm` file, the monitor will tell you to use
`source` / `loadasm` instead.

`loadasm` accepts:

- source-style files:

```text
moveq #0,d0
loop:
addq.w #1,d0
cmpi.w #10,d0
bne loop
monitor
```

- transcript-style files, if the first non-blank line is `a <addr>`:

```text
a 00090000
moveq #0,d0
loop:
addq.w #1,d0
cmpi.w #10,d0
bne loop
monitor
```

Blank lines and `;` comments are ignored.

`loadasm` now supports a small label model:

- label definitions on their own line, for example `loop:`
- label targets for:
  - `bra`
  - `bsr`
  - `bne`
  - `beq`
  - `jmp`
  - `jsr`
- `dbra` with a label target
- simple data directives:
  - `dc.b`
  - `dc.w`
  - `dc.l`

Interactive `a <addr>` entry is still line-by-line and does not resolve labels.

`save/` is for binaries and captured outputs.

`source/` is for editable monitor-source text in the current tiny assembler subset.

It is not a full host-assembler source tree. Files placed there should be valid
for `loadasm`.

Files saved with `save` are written as raw binary.

### Assembler Workflows

There are two intended ways to work with assembly text.

#### Interactive Entry

Use the tiny line assembler directly in the monitor:

```text
a 00090000
moveq #0,d0
addq.w #1,d0
cmpi.w #10,d0
bne 00090002
monitor
```

Blank line ends assembly and returns to `j68>`.

#### Source Files In `source/`

Put monitor-loadable source in `source/` and load it with `loadasm`:

```text
source
loadasm 00090000 count10.asm
u 00090000
g 00090000
r
```

This is for the tiny monitor assembler subset only.

#### Host-Assembled Programs In `work/programs/`

For richer programs, use the host assembler instead of `loadasm`.

Build all host-side example programs with:

```sh
work/programs/build.sh
```

That writes flat binaries into `save/`. Load and run them with the normal
binary path:

```text
list
load 00090000 puthex.bin
g 00090000
```

Current host-built examples include:

- `hello_uart.bin`
  - prints `HELLO`
- `puthex.bin`
  - prints `1234ABCD`
- `print_pi16.bin`
  - prints `3.14154`
- `print_status.bin`
  - prints:
    - `D0=1234ABCD`
    - `PI16=0003243C`
- `ram_checksum.bin`
  - fills/checks RAM and leaves checksum in `D0`
- `pi16_nilakantha.bin`
  - computes pi in `16.16` and leaves the result in `D0`

### CPU Test Build Flow

The standalone CPU runner in `test/` is cache-first by default.

Default run:

```sh
cd test
node runner.js
```

This uses existing `r/*.r` binaries and only rebuilds missing outputs.

Explicit source rebuild run:

```sh
cd test
node runner.js --from-source
```

This rebuilds all `asm/*.s` inputs into `r/*.r` first, then runs the tests.

Direct build maintenance:

```sh
cd test
node build.js --rebuild-missing
node build.js --rebuild-all
node build.js --clean --rebuild-all
```

### Helper Layers

There are now two distinct helper layers.

- monitor-source helper model:
  - tiny `loadasm` subset
  - quick experiments
  - labels and `dc.b/dc.w/dc.l`
- host-assembled 68k helper model:
  - reusable code in `work/programs/lib/console.inc`
  - richer output formatting
  - shared routines such as:
    - `putc`
    - `puts`
    - `newline`
    - `puthex32`
    - `puts_hex32`

### Role Split

Keep the roles separate.

- `Node.js` owns:
  - machine model
  - bus
  - devices
  - UART/terminal bridge
  - file backing
  - monitor shell
  - later web/UI and host-side sound/video plumbing
- `68k machine code` owns:
  - guest-side monitor/program logic
  - formatting helpers
  - reusable runtime routines
  - standalone binaries that talk to the virtual machine through MMIO

The guest code does not talk to the host directly. It talks to virtual UART,
timer, and later other virtual devices. Node remains the real-world bridge.

Enter instructions directly into memory:

```text
a 00090000
moveq #0,d0
addq.w #1,d0
cmpi.w #10,d0
bne 00090002
monitor
```

Finish assembler mode with a blank line.

Then inspect and run:

```text
u 00090000
g 00090000
r
```

#### Source File Load

Put a small monitor-source file in `source/`, for example `source/count10.asm`:

```asm
; count to ten and return to the monitor
a 00090000
moveq #0,d0
loop:
addq.w #1,d0
cmpi.w #10,d0
bne loop
monitor
```

Then use:

```text
source
loadasm 00090000 count10.asm
u 00090000
g 00090000
r
```

Expected result:

```text
D0=0000000A
```

Another example in `source/` is `data_demo.asm`, which shows `dc.w` and `dc.l`:

```asm
; proof of dc.w and dc.l in monitor source
movea.l #table,a0
monitor

table:
dc.w $1234,$ABCD
dc.l $89ABCDEF,1
```

Use it like this:

```text
source
loadasm 00090000 data_demo.asm
g 00090000
r
m 00090008
```

Expected result:

```text
A0=00090008
00090008: 12 34 AB CD 89 AB CD EF 00 00 00 01
```

#### Save Back To Source

You can save a RAM region back to monitor source text:

```text
loadasm 00090000 count10.asm
saveasm 00090000 0E saved_count10.asm
source
```

`saveasm` writes a transcript-style file with:

- `a <addr>` origin line
- disassembled instruction lines
- `dc.w` / `dc.b` fallback for anything not in the current decode subset

#### Binary Workflow

Use `save/` for already-built binaries:

```text
list
load 00090000 hello_uart.bin
g 00090000
```

Examples currently included in `save/`:

- `hello_uart.bin`
- `ram_checksum.bin`
- `pi16_nilakantha.bin`

### Timer / IRQ State

Show current timer and interrupt-controller state:

```text
i
```

Set timer reload value:

```text
ti 3e8
```

Enable or disable timer:

```text
te 1
te 0
```

Set interrupt mask bitmap:

```text
tm 7f
```

### Benchmark

Run a small benchmark:

```text
bench 1
bench 2
bench 3
bench 1 50000
```

### Reset

Reset the whole machine and re-enter the ROM monitor:

```text
reset
```

## Current Limitations

The monitor is usable now for inspect/edit/run/save/load work, but it is still intentionally small.

Not implemented yet:

- breakpoints
- full symbolic assembly
- macros/expressions
- complex file formats

## Example: Count To 10

This small program counts in `D0` from `0` to `10`, then returns to the monitor via the monitor trap word `A000`.

Monitor session:

```text
a 00090000
moveq #0,d0
addq.w #1,d0
cmpi.w #10,d0
bne 00090002
monitor

u 00090000
g 00090000
r
```

Expected result after the run:

- `D0=0000000A`
- control returns to `j68>`
- blank line in assembler mode ends entry and returns with `ASSEMBLY DONE`

## Example: Print Characters

This program writes characters directly to the UART MMIO data register at `00DE0000`.
It prints `A` through `J`, then returns to the monitor.

Monitor session:

```text
a 00090020
movea.l #$00de0000,a0
moveq #65,d0
move.b d0,(a0)
addq.b #1,d0
cmpi.b #75,d0
bne 00090028
monitor

u 00090020
g 00090020
```

Expected result:

- monitor console prints `ABCDEFGHIJ`
- control returns to `j68>`

## Suggested First Workflow

A practical loop right now is:

1. start the monitor
2. patch bytes into RAM with `m`
3. disassemble with `u`
4. run with `g`
5. inspect registers with `r`
6. save with `save`
7. reload with `load`
8. use `reset` to reboot back into the ROM monitor

## Files

Relevant files:

- `tools/monitor.js`
- `rom/monitor.S`
- `src/monitor/command_loop.js`
- `src/monitor/commands.js`
- `save/`
