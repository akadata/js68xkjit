# 68K-Monitor.X68 Working Copy

## Scope

This directory contains a non-destructive working copy of `68K-Monitor.X68`
adapted enough to:

- assemble with `vasmm68k_mot`
- run as a guest binary under the j68 lab machine far enough to validate
  console remap and guest RAM/layout rebasing

Guest-side adaptation is intentionally paused at the current CPU-core limit.

## Files

- `68K-Monitor.work.s`
  - CRLF normalized to LF
  - Easy68K editor trailer removed
  - footer `END/ENDC` block removed for `vasm` compatibility
  - case-only symbol fixes:
    - `loop` -> `LOOP`
    - `IDE_Buffer` -> `IDE_BUFFER`
  - one source-level compatibility change:
    - `MOVE.L #SW68K,D5` + `MOVE.L D5,A2`
    - replaced with `MOVEA.L #SW68K,A2`
- `68K-Monitor.bin`
- `68K-Monitor.lst`

Current guest copy changes also include:

- console remap to the j68 UART region
- guest ROM/RAM rebase from `00FDxxxx` to the j68 guest load layout at
  `00090000` / `00098100`
- removal of the initial `IOBYTE`-dependent console-selection path

## Successful Assemble Command

```sh
/opt/amiga/bin/vasmm68k_mot \
  -quiet \
  -m68000 \
  -Fbin \
  -L work/68k-monitor/68K-Monitor.lst \
  -o work/68k-monitor/68K-Monitor.bin \
  work/68k-monitor/68K-Monitor.work.s
```

## Output

- flat binary produced: `work/68k-monitor/68K-Monitor.bin`
- listing produced: `work/68k-monitor/68K-Monitor.lst`

## Extracted Machine Assumptions

### Reset and ROM

- ROM origin: `0x00FD0000`
- initial SSP: `0x00FD8100`
- initial PC: `0x00FD0020`
- code starts at `0x00FD0020`
- RAM/data area begins at `0x00FD8100`

### Console and I/O

- console status: `KEYSTAT = 0x00FF0000`
- console input: `KEYIN = 0x00FF0001`
- console output: `KEYOUT = 0x00FF0001`

### Other Hardware Ports

- IDE:
  - `0x00FF0030` .. `0x00FF0034`
- PIC:
  - `MASTER_PIC_PORT = 0x00FF0020`
- timer:
  - `TIMER = 0x00FF0040`
- SCC serial:
  - `0x00FF00A0` .. `0x00FF00A3`
- machine handoff/debug:
  - `SW68K = 0x00FF00EE`
  - `IOBYTE = 0x00FF00EF`

## Current j68 Lab Machine Assumptions

- ROM window: `0x00F80000` .. `0x00FFFFFF`
- UART MMIO base: `0x00DE0000`
- timer/intc live in the `0x00DE....` test-machine MMIO window
- no S-100 PIC/SCC/IDE/Z80 handoff hardware exists

## Minimum Patch Plan For j68

### Option 1: Guest Program First

Smallest-risk path:

1. keep the current j68 ROM monitor as the boot monitor
2. load `68K-Monitor.bin` as a guest program into RAM
3. patch entry and console/MMIO assumptions in the copied source
4. jump to the guest monitor entry with `g`

This avoids replacing reset vectors or whole-machine boot immediately.

### Option 2: Replacement ROM Later

Higher-risk path:

1. rebase ROM origin from `0x00FD0000` to `0x0000F80000`
2. rewrite initial SSP/PC vectors for the j68 reset overlay/ROM layout
3. move data/BSS out of ROM into RAM
4. replace all S-100-specific I/O assumptions

### Required Source Adaptations Before Either Path Runs

1. remap console I/O:
   - from `0x00FF0001`
   - to the j68 UART device region at `0x00DE0000`
2. remove or stub unsupported hardware paths:
   - IDE
   - PIC
   - SCC serial
   - Z80 handoff via `SW68K`
3. review timer/interrupt code against the j68 timer/intc model
4. review low-RAM/vector initialization assumptions
5. review ROM/RAM write expectations:
   - the source currently assumes a very specific ROM+RAM layout around `0x00FDxxxx`

## Current Integration Checkpoint

The guest port has crossed the machine-assumption threshold:

- console MMIO assumptions are satisfied
- guest RAM/layout assumptions are satisfied well enough for startup
- execution advances into real guest code

The first blocker is now a CPU-core execution gap, not machine mapping:

```text
g 00090020
FAULT PC=000917FC OP=C240
SR=2700 D0=0000000F D1=00000000 A0=00DE0004 A1=00DE0000
```

`OP=C240` is `AND.W D0,D1`.

This is the right place to stop guest-side workaround patching. Continuing to
patch the guest around core gaps would turn the port into monitor-specific
whack-a-mole instead of a useful CPU integration probe.

## Recommendation

Do not try to boot this as the replacement ROM yet.

First adapt it as a guest monitor program with:

- console remap
- unsupported device paths disabled
- entry point run from RAM

That stage is now complete enough to say:

- machine scaffolding is no longer the blocker
- the current blocker is CPU implementation depth beyond the validated subset

Only return to the guest binary after the exposed core path is understood or
fixed with a focused repro.
