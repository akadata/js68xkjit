# j68k Progress

**Date:** 2026-03-22  
**Primary runner command:** `cd test && node runner.js`  
**Primary runner result:** `231/233` passing  
**Remaining failures:** `callm`, `rtm`
**Legacy filtered profile:** `cd test && J68_SKIP_FILE=phase1.skip node runner.js` -> `195/195` passing, `38` skipped

---

## Current State

- The validated semantic suite is currently clean.
- All malformed placeholder families have been replaced with real semantic tests.
- The only unresolved instruction family is `CALLM/RTM`.
- `CALLM/RTM` remain unresolved because the local `callm.s` / `rtm.s` files are invalid smoke tests and the local corpus does not provide enough concrete module-descriptor/module-frame detail to replace them with authoritative semantic tests.
- `phase1.skip` remains a valid legacy filtered profile for narrowed subset regression runs, but it is not the project baseline.

---

## CALLM/RTM Findings

The local Motorola corpus is sufficient to establish the following:

1. `CALLM` / `RTM` are real instructions in the M68020-family architecture.
2. `CALLM` uses an external module descriptor and creates a module frame on the stack.
3. `RTM` reloads a previously saved module state from the top of stack.
4. The access-level mechanism is tied to the MC68851 module-call flow.

The local Motorola corpus is not sufficient, in directly usable concrete form, to establish:

1. the exact module descriptor memory layout,
2. the exact saved module state / module frame layout,
3. a complete concrete stack/register image for an end-to-end `CALLM` → `RTM` semantic test.

Because those pieces are missing from the available local reference material, `CALLM/RTM` are explicitly deferred rather than guessed.

### Sources Consulted

- `/home/smalley/pistorm64/Hardware/mc68xxx/M68000PRM.txt`
  - `CALLM` page around `17894-18013`
  - `RTM` page around `30856-30920`
- `/home/smalley/pistorm64/Hardware/mc68xxx/MC68xxx.txt`
  - module/access-level overview around `218012-218021`
  - instruction cross-reference / summary tables around `98888`, `100141`, `101833+`
- `/home/smalley/pistorm64/Hardware/mc68xxx/MC68851.txt`
  - module/access-level overview around `348-356`
  - module-call retry mention around `874`

---

## Historical Decode Fix

`r/callm.r` was not failing because of the runner alone. There were two separate issues:

1. `0x06d0` is a real 68020 `CALLM` opcode, but `decode0()` was matching it with the overbroad `OR` path and executing garbage semantics.
2. `test/asm/callm.s` is not a valid Phase 1 semantic test for the current MC68000 baseline. It is a generated 68020 placeholder and its check block is not meaningful for validating real `CALLM` execution here.

What was fixed:
- `decode0()` now rejects the `CALLM/RTM` opcode family instead of mis-decoding it as `OR`.
- `CALLM/RTM` remain in the runner as explicit invalid-smoke entries, not as covered instructions.
