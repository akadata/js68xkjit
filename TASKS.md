# Tasks

## Current Stable Baseline

- `./runtests.sh` must stay green.
- `cd test && node runner.js` must stay `231/233`.
- `CALLM` and `RTM` remain explicitly deferred and untouched.

## Current Machine / Monitor Checkpoint

The small j68 software environment has reached a clean checkpoint:

- ROM monitor is stable
- `source/` + `loadasm` workflow is stable
- host-built binaries in `work/programs/` build into `save/`
- reusable guest-side output helpers now exist
- visible formatted output works from real 68k binaries

Current reusable guest-side helper layer:

- `work/programs/lib/console.inc`
  - `putc`
  - `puts`
  - `newline`
  - `puthex32`
  - `puts_hex32`

Current visible proof binaries:

- `hello_uart.bin`
- `puthex.bin`
- `print_pi16.bin`
- `print_status.bin`
- `ram_checksum.bin`
- `pi16_nilakantha.bin`

This is now a proper little software environment, not just isolated probes.

## Next Subsystem Boundary

The next clean subsystem is input, not `CALLM/RTM`.

Recommended next order:

1. guest-side input helpers
   - `getc`
   - prompt helper
   - simple line read
2. one interactive demo binary
   - `echo_line.bin`
3. only after input is solid:
   - cooperative multitasking work

Cooperative multitasking remains on the roadmap, but it should come after the
input-side helper layer so the machine has a usable conversational path first.

## Current Architectural Gap

The machine has a useful memory API and device map, but it is still growing from a memory map into a 68k-style external bus model.

The most important missing semantics are:

- `FC[2:0]`
- `IPL[2:0]`
- `BERR`

Related lower-priority concepts that should remain deferred until needed:

- `AS`
- `UDS/LDS`
- `DTACK`
- `VPA/VMA`
- `RESET/HALT`
- bus arbitration (`BR/BG/BGACK`)

## Bus Transaction Model

Keep the public API:

- `read8/read16/read32`
- `write8/write16/write32`

Under that, model transactions with:

- `addr`
- `size`
- `write`
- `value`
- `fc`
- `ipl`
- `kind`
- result fields such as:
  - `value`
  - `berr`

The bus must distinguish at least:

- user data
- user program
- supervisor data
- supervisor program
- instruction fetch vs data access

## Priority Order

1. Add transaction metadata under the current bus API.
2. Expose resolved current IPL cleanly.
3. Add machine-visible `BERR` result path.
4. Leave timing and handshake details for later.

## Acceptance For This Slice

- existing tests still pass
- add focused system tests for:
  - transaction carries `fc`
  - unresolved access produces `berr`
  - highest active `IPL` wins

## Explicitly Not In Scope

- `DTACK` timing
- `AS/UDS/LDS` pin modeling
- `DMA`
- storage/sound expansion
- more device families
- `CALLM/RTM`
- `FPU` work

## Guest Monitor Integration Checkpoint

`68K-Monitor.X68` guest bring-up is paused at the correct boundary:

- machine map and UART remap are no longer the first blocker
- guest RAM/layout rebase is no longer the first blocker
- startup reaches real guest code

Current exposed blocker:

```text
FAULT PC=000917FC OP=C240
```

This is `AND.W D0,D1` reached from the adapted guest monitor.

Required next CPU-facing work:

1. build a tiny standalone repro around `AND.W D0,D1`
2. determine whether the problem is:
   - decode missing
   - execute missing
   - PC advance corruption
   - flags or register writeback
3. only return to the guest monitor after that path is understood

Guest adaptation must stay paused here to avoid turning porting into repeated
workarounds for core gaps.
