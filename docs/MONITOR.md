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

If you try to `load` an `.asm` file, the monitor will tell you to use
`source` / `loadasm` instead.

`loadasm` accepts:

- source-style files:

```text
moveq #0,d0
addq.w #1,d0
cmpi.w #10,d0
bne 00090002
monitor
```

- transcript-style files, if the first non-blank line is `a <addr>`:

```text
a 00090000
moveq #0,d0
addq.w #1,d0
cmpi.w #10,d0
bne 00090002
monitor
```

Blank lines and `;` comments are ignored.

`save/` is for binaries and captured outputs.

`source/` is for editable monitor-source text in the current tiny assembler subset.

It is not a full host-assembler source tree. Files placed there should be valid
for `loadasm`.

Files saved with `save` are written as raw binary.

### Assembler Workflows

There are two intended ways to work with assembly text.

#### Interactive Entry

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
moveq #0,d0
addq.w #1,d0
cmpi.w #10,d0
bne 00090002
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
- symbolic assembly
- labels/macros/expressions
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
