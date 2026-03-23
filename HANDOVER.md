# HANDOVER

## Current State

The project is at a stable checkpoint.

- System test wrapper:
  - `./runtests.sh` passes
- CPU corpus:
  - `cd test && node runner.js`
  - `Passed: 252/254`
  - `Failed: 0/252`
  - `Deferred: 2/254`
- Deferred only:
  - `CALLM`
  - `RTM`

Those two remain deferred invalid smoke tests, not active emulator regressions.

## What Is Working

### Machine / monitor

- ROM monitor boots and prompts reliably
- `load`, `loadasm`, `save`, `saveasm`, `list`, `source`, `reset`, `quit`
- interactive `g`, `gl`, `t`
- UART output and polling input
- host-side line editing
- cached build flow by default, explicit `--from-source` / rebuild modes available

### Guest-side software environment

- host-built binaries in `save/`
- monitor-loadable source in `source/`
- reusable 68k-side helper layers:
  - `console.inc`
  - `input.inc`
  - `task.inc`
- interactive demo:
  - `echo_line.bin`
- cooperative demos:
  - `coop_demo.bin`
  - `coop_regs.bin`

### Recent fixes now in place

- `MOVEM`
- `NBCD`
- `ABCD`
- register shifts/rotates
- memory rotates
- bitfield + shift/rotate family extracted to `lineE.js`
- logical memory-destination tests now cover:
  - `AND Dn,<ea>`
  - `OR Dn,<ea>`
  - `EOR Dn,<ea>`
- `NEG`, `NEGX`, `SUBX`, `TST` real tests
- memory shift tests no longer placeholders
- `ADDQ/SUBQ` on address registers now implemented
- byte-sized `A7` destination/source stack step now uses `2` in EA helpers
- cooperative rerun path fixed:
  - repeated `g` on `coop_regs.bin` now works cleanly
- `quit` command exits the launcher cleanly

## Known-Good Commands

### Cached/default paths

Normal monitor start:

```sh
node tools/monitor.js
```

Normal system suite:

```sh
./runtests.sh
```

Normal CPU corpus:

```sh
cd test && node runner.js
```

### Explicit source rebuild paths

CPU corpus from source:

```sh
./runtests.sh runner --from-source
```

Full CPU artefact rebuild:

```sh
./runtests.sh runner --rebuild-all
```

Clean + full rebuild:

```sh
./runtests.sh runner --clean --rebuild-all
```

Monitor ROM rebuild from source:

```sh
node tools/monitor.js --from-source
```

### Host-built guest program rebuild

```sh
./work/programs/build.sh
```

That refreshes:

- `save/coop_demo.bin`
- `save/coop_regs.bin`
- `save/echo_line.bin`
- `save/hello_uart.bin`
- `save/pi16_nilakantha.bin`
- `save/print_pi16.bin`
- `save/print_status.bin`
- `save/puthex.bin`
- `save/ram_checksum.bin`

## Known-Good Manual Repros

### Cooperative demos

```text
j68> load 00190000 coop_demo.bin
j68> load 00180000 coop_regs.bin
j68> g 00190000
ABABABABAB
j68> g 00180000
ABCDEF
j68> g 00180000
ABCDEF
```

This specific rerun path was broken earlier and is now a required regression.

### Clean launcher exit

```text
j68> quit
BYE
```

### Monitor source path

```text
j68> source
j68> loadasm 00090000 helloworld.asm
j68> g 00090000
```

### Host-built binary path

```text
j68> list
j68> load 00090000 puthex.bin
j68> g 00090000
1234ABCD
```

## Important Recent Diagnoses

### The repeated `g` corruption was not a console bug

It first looked like a launcher/prompt redraw issue because the visible symptom was:

- prompt text colliding with output
- stale `A`
- repeated `j68>` prompts

The real fault was guest-side cooperative restart state.

Specifically:

- `coop_regs.bin` ran correctly once
- rerunning from the same loaded image was not restart-clean
- the fix was in the cooperative runtime/bootstrap, not the line editor

The current runtime now:

- clears both TCBs on entry
- stores an explicit `TCB_ENTRY`
- starts a fresh task by `jmp` to `TCB_ENTRY`
- does not rely on a fake stack-seeded `rts` startup frame

That design should be preserved.

### The line editor still matters, but it is no longer the blocker for this repro

Host-side input editing remains in `tools/monitor.js` / `tools/support/line_editor.js`.

Keep that role split:

- Node: terminal editing and host UX
- 68k guest code: machine-visible input/output logic

## Important Architectural Direction

Do not let `src/j68.js` continue to grow as a single wall.

The current first extraction already exists:

- `src/instructions/line5.js`
- `src/instructions/line4.js`
- `src/instructions/line8.js`
- `src/instructions/lineE.js`
- `src/instructions/movem.js`
- `src/instructions/nbcd.js`
- `src/instructions/abcd.js`
- `src/instructions/shift_rotate.js`

This needs to continue.

### Recommended split strategy

Do not jump straight to one-file-per-opcode.

Use staged extraction:

1. keep `j68.js` as the central dispatcher
2. move implementation by opcode family / line
3. only then split heavy families further

Recommended next structure:

```text
src/
  j68.js
  instructions/
    line0.js
    line4.js
    line5.js
    line8.js
    line9.js
    lineB.js
    lineC.js
    lineD.js
    lineE.js
```

Then later:

```text
src/instructions/line4/
  movem.js
  nbcd.js
  abcd.js
```

The goal is:

- stable central decode
- smaller implementation files
- cleaner diffs
- easier test-to-code mapping

## Real Blockers

### 1. Remaining semantic gaps in `j68.js`

The suite is strong, but the core is not complete for all supported CPU families.

Known remaining categories from prior review:

- base-core semantic gaps still hidden in `not impl` / narrow-path handling
- remaining EA coverage holes
- 68020+ full-format index/extension handling still incomplete
- partial supervisor/system-family coverage
- PMMU / 030 / 040 scaffolding exists but is not complete architectural support

### 1a. Extraction work is now part of the blocker

It is no longer enough to only add semantics.

Continuing to leave new work inside `src/j68.js` will make future progress slower and riskier.

So the active blocker is two-part:

1. remaining semantic gaps
2. continued consolidation of those semantics out of the `j68.js` wall

### 2. `CALLM` / `RTM`

Still deferred.

Reason:

- missing authoritative local semantic fixtures
- local smoke tests are intentionally invalid
- do not guess module descriptor or saved module-state behavior

Only revisit when valid descriptor-backed tests can be built from authoritative docs.

### 3. GNU toolchain portability of all source rebuilds

The build flow is fixed.

But source rebuilds on some hosts still depend on assembler compatibility with the existing source corpus.

Current truth:

- cached/default runs are correct
- explicit source rebuilds work on hosts with a compatible assembler
- some GNU-style m68k assemblers reject parts of the current test corpus

That is now a source/toolchain portability issue, not a runner flow issue.

## Immediate Action Plan

### Phase 1: Continue instruction extraction

Do this next.

1. create `src/instructions/line5.js`
   - done
   - `ADDQ/SUBQ`, `DBcc`, `Scc`, `TRAPcc` line-5 family extracted
2. create `src/instructions/line4.js`
   - done
   - line-4 family extracted around `MOVEM`, `NBCD`, `NEG`, `NEGX`, `NOT`, `CLR`, control-transfer/system cases
3. create `src/instructions/line8.js`
   - done
   - line-8 family extracted around `SBCD`, `DIVU`, `DIVS`, `PACK`, `UNPK`, `OR`
4. create `src/instructions/lineE.js`
   - done
   - bitfields + shift/rotate now extracted behind `lineE.js`

Do this as a refactor first, not a semantic expansion pass.

Acceptance:

- no semantic change
- `./runtests.sh` still passes
- `cd test && node runner.js` stays:
  - `Passed: 252/254`
  - `Deferred: 2/254`

### Phase 2: Enumerate remaining `not impl` paths

Do not guess. Inventory them.

Use searches like:

```sh
rg "not impl|TODO|throw console.assert" src/j68.js src/instructions
```

For each remaining path:

1. identify instruction family
2. identify whether a test exists
3. add a real CPU test if missing
4. implement or explicitly defer with reason

Current concrete inventory from `rg "not impl|TODO|throw console.assert" src/j68.js src/instructions`:

- `src/j68.js`
  - generic EA decode holes
  - destination EA decode holes
  - remaining line-4 default fallthrough
  - remaining line-8 opmode fallthrough
  - bitfield EA fallthrough
  - `PMOVE` mode fallthroughs
  - line-0 default fallthrough
  - line-B default fallthrough
  - line-C default fallthrough
  - `CALLM/RTM` deferred assert path
- `src/instructions`
  - `movem.js`
    - full-format indexed EA not implemented
  - `shift_rotate.js`
    - memory decode still uses a generated `throw console.assert(false)` for unsupported source-side path
  - `line5.js`
    - non-covered `ADDQ/SUBQ` modes still intentionally assert

This inventory should be used to pick the next real CPU block instead of guessing.

### Phase 3: Close the next real instruction gaps

Best next targets:

1. remaining `CMP` opmode/family gaps and stronger `CMP*` coverage
2. remaining effective-address coverage holes
3. `MOVEM` depth / corner cases if any gaps remain
4. any still-partial line-0 / line-4 / line-8 / line-E paths discovered by the inventory

Do not reopen monitor/device/runtime work during this phase unless a CPU change breaks an existing demo or system test.

### Phase 4: Only then reassess 020+/030+/040 completeness

After the base-core gaps are cleaned up:

1. 68020 integer/supervisor completeness
2. broader indexed EA support
3. bitfield hardening
4. `CAS`, `CAS2`, `CHK2`, `TRAPcc` hardening
5. PMMU / 030 / 040 system behavior

Do not claim complete CPU-family coverage before this work is actually done.

## Coverage Goal

Target:

- effectively complete active local instruction corpus
- no placeholder semantic tests
- all active runner entries passing
- only `CALLM` / `RTM` deferred by design

Current measured local status is:

- `252/254` passed
- `2/254` deferred

That is the current practical baseline.

If aiming for “99.9% coverage”, keep the language precise:

- test corpus coverage is strong
- architectural CPU-family completeness is not yet total

Do not conflate the two.

## Files Worth Reading First Next Session

- [src/j68.js](/home/smalley/reference/j68k/src/j68.js)
- [src/instructions/movem.js](/home/smalley/reference/j68k/src/instructions/movem.js)
- [src/instructions/nbcd.js](/home/smalley/reference/j68k/src/instructions/nbcd.js)
- [src/instructions/abcd.js](/home/smalley/reference/j68k/src/instructions/abcd.js)
- [src/instructions/shift_rotate.js](/home/smalley/reference/j68k/src/instructions/shift_rotate.js)
- [work/programs/lib/task.inc](/home/smalley/reference/j68k/work/programs/lib/task.inc)
- [work/programs/coop_demo.s](/home/smalley/reference/j68k/work/programs/coop_demo.s)
- [work/programs/coop_regs.s](/home/smalley/reference/j68k/work/programs/coop_regs.s)
- [TODO.md](/home/smalley/reference/j68k/TODO.md)
- [TASKS.md](/home/smalley/reference/j68k/TASKS.md)
- [TASKLIST.md](/home/smalley/reference/j68k/TASKLIST.md)

## Practical Restart Point

If resuming immediately, do this:

1. inventory remaining `CMP` / EA gaps after the current `lineE` and logical-family work
2. run:
   - `./runtests.sh`
   - `cd test && node runner.js`
3. inventory remaining `not impl` paths
4. close the next narrow `CMP` or EA family with real memory/register assertions first

If the next session needs a manual sanity check before CPU work, use:

```text
j68> load 00190000 coop_demo.bin
j68> load 00180000 coop_regs.bin
j68> g 00190000
j68> g 00180000
j68> g 00180000
j68> quit
```

That is the safest continuation path from the current checkpoint.
