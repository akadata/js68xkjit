# j68k Family Coverage Matrix

**Last Updated:** 2026-03-22  
**Source-of-truth runner baseline:** `231/233` passing  
**Legacy filtered subset baseline:** `195/195` passing with `38` skipped via `J68_SKIP_FILE=phase1.skip node runner.js`  
**Meaning of that baseline:** the current curated semantic suite is clean except for explicitly deferred `CALLM/RTM`. It does **not** imply broad completion of the full 68k family.

---

## Status Legend

| State | Meaning |
|------|---------|
| `Covered` | Covered by the current semantic suite at a level strong enough to treat the presently-written tests as clean |
| `Partial` | Some meaningful semantic coverage exists, but significant instruction groups, addressing modes, or architectural paths remain open |
| `Deferred` | Not counted as covered because authoritative local semantics are insufficient for a real semantic test |
| `Untested` | No meaningful semantic test coverage currently exists |

---

## Family Matrix

| Family | Current Status | Covered By Current Semantic Tests | Partial / Open Areas | Deferred | Untested |
|------|------|------|------|------|------|
| `68000` | `Partial` | Core arithmetic/logic/branch/control coverage in the current suite; current validated subset is clean | Shift/rotate completeness, `MOVEM`, broader EA closure, and other gaps still show in [CPUTASKS.md](CPUTASKS.md) | — | Some instruction-group breadth is still not covered by the current suite |
| `68010` | `Partial` | Current suite includes real privilege/frame-path tests for `MOVEC`/`MOVES`/`RTD`-adjacent behavior and supervisor/privilege flows now in the runner | Not a full 68010 completion claim; broader generation-level closure is still not established | — | Any 68010 paths without dedicated semantic tests |
| `68020` | `Partial` | Bitfields, `CAS*`, `CHK2/CMP2`, `PACK/UNPK`, `TRAPcc`, and other 68020 additions have semantic tests in the current suite | Full 68020 completion is not established; extended multiply/divide, full addressing-mode closure, coprocessor-interface families, and broader architectural coverage remain open | `CALLM/RTM` | Multiple 68020 families still have no semantic coverage |
| `68030` | `Partial` | Current suite includes real semantic tests for the PMMU block now in use: `PFLUSH`, `PFLUSHA`, `PLOAD`, `PMOVE`, `PTEST` | This is not full 68030 or full MC68851 coverage; broader MMU/control behavior remains open | — | Large parts of 68030/MC68851 behavior |
| `68040 + cache/MMU` | `Partial` | Current suite includes semantic tests for `CINV`, `CPUSH`, `MOVE16`, and 68040-scoped PMMU success/privilege paths where applicable | Full 68040 cache/MMU coverage is not established; only the currently-written semantic subset is clean | — | Broader 68040 cache/MMU behavior outside the present suite |
| `68040 FPU` | `Untested` | `fline.s` only validates the trap/hook path | No broad floating-point semantic coverage | — | Almost the entire 68040 FPU instruction set |
| `68881 / 68882` | `Untested` | No meaningful semantic suite beyond generic F-line handling | — | — | Major floating-point families remain unchecked: arithmetic, transcendental, movement, compare/test, control/state |

---

## Specific Non-Claims

- `231/233` does not mean the emulator is nearly complete across `68000`, `68010`, `68020`, `68030`, `68040`, `68881`, or `68882`.
- It means the **current curated semantic suite** is clean except for the explicitly deferred `CALLM/RTM` pair.
- `CALLM/RTM` are deferred, not accidentally incomplete. See [COVERAGE.md](COVERAGE.md) and [PROGRESS.md](PROGRESS.md).

---

## Reading Order

1. [COVERAGE.md](COVERAGE.md) for current validated-suite truth
2. [PROGRESS.md](PROGRESS.md) for current blocker/defer notes
3. This file for family-level interpretation
4. [CPUTASKS.md](CPUTASKS.md) as the gap map, especially for `68020+`, MMU, and FPU work
