# j68k Coverage Snapshot

**Last Updated:** 2026-03-22  
**Assembly corpus:** `233` files  
**Build status:** `233/233` build  
**Primary runner status:** `231/233` passing  
**Remaining failures:** `callm`, `rtm`
**Legacy filtered profile:** `J68_SKIP_FILE=phase1.skip node runner.js` -> `195/195` passing, `38` skipped

---

## Current Truth

- The currently validated semantic suite is clean.
- All malformed placeholder families have been replaced with real semantic tests.
- The only unresolved area is `CALLM/RTM`.
- `CALLM/RTM` are not counted as coverage because the local `callm.s` / `rtm.s` files are still invalid smoke tests, not architectural semantic tests.
- [FAMILY_MATRIX.md](FAMILY_MATRIX.md) is the family-level interpretation of this baseline. Use it to avoid reading `231/233` as broad 68k-family completion.
- `phase1.skip` is a legacy filtered compatibility profile. It is still valid for subset regression runs, but it is not the source of truth for overall project status.

---

## Current Meaningful Coverage

| Area | Status | Notes |
|------|--------|-------|
| ADD/SUB/ADDQ/SUBQ | ✅ | Covered in the current validated semantic suite |
| AND/OR/EOR immediate/Dn paths | ✅ | Current passing coverage intact |
| Bcc/BRA/BSR | ✅ | Backward branch fix is in place |
| Bit ops (`BTST/BCLR/BCHG/BSET`) | ✅ | Real `decode0` implementation |
| `CHK` | ✅ | Real vector-6 compare-and-trap implementation |
| `CMP/CMPI/CMPA/CMPM` | ✅ | Real compare-family execution in place |
| `DBcc/DBRA` | ✅ | Real decrement-and-branch semantics in place |
| `DIVS/DIVU` | ✅ | Word divide paths working in the current validated semantic suite |
| `CLR` | ✅ | Correct line 4 decode and execution path |
| `EXG` | ✅ | All three register-exchange forms working |
| `EXT` | ✅ | `EXT.W` and `EXT.L` decode/execute working |
| Trap-like hook path | ✅ | `fline`, `illegal`, `trap`-style check-block flow works |
| `MOVE SR/CCR` | ✅ | Exact line-4 system move forms working |
| Shift/rotate | 🟡 | Still incomplete |
| MOVEM | ❌ | Missing; current `MOVE.L` frontier is blocked in broader move EA coverage before full `MOVEM` work |
| MULS/MULU flags | ❌ | Missing correct CCR semantics |

---

## CALLM/RTM Status

- `CALLM` and `RTM` are real M68020-family instructions; the family PRM contains the instruction-level descriptions and encodings.
- The earlier line-0 decode bug is fixed: the emulator no longer mis-decodes the `CALLM/RTM` opcode family as `OR`.
- The current local `test/asm/callm.s` and `test/asm/rtm.s` remain invalid smoke tests:
  - `callm.s` executes `callm #0,(a0)` without a valid module descriptor.
  - `rtm.s` executes bare `rtm d0` without a saved module state on the stack.
- The local corpus consulted here is not sufficient to build authoritative semantic tests for `CALLM/RTM` because it does not define, in usable concrete form:
  - the module descriptor layout,
  - the saved module state / module frame layout,
  - the exact stack/register image needed for a valid round-trip test.
- Result: `CALLM/RTM` are explicitly deferred, not claimed as covered.

### Sources Consulted

- `/home/smalley/pistorm64/Hardware/mc68xxx/M68000PRM.txt`
  - `CALLM` instruction page around lines `17894-18013`
  - `RTM` instruction page around lines `30856-30920`
- `/home/smalley/pistorm64/Hardware/mc68xxx/MC68xxx.txt`
  - family overview around lines `218012-218021`
  - instruction summary / cross-reference tables around lines `98888`, `100141`, `101833+`
- `/home/smalley/pistorm64/Hardware/mc68xxx/MC68851.txt`
  - access-level / module-call overview around lines `348-356`, `874`

These sources establish that `CALLM/RTM` are real instructions and that they interact with the module/access-level mechanism, but they do not provide enough concrete descriptor/frame layout detail to design authoritative semantic tests from local text alone.

---

## Runner Configuration

`test/phase1.skip` is a legacy filtered compatibility profile. It excludes tests outside the narrowed 68000-focused subset:
- 68010+
- 68020+
- 68030/68040 cache/MMU additions

This profile is still useful for subset regression measurement, but it is not the primary project baseline. The unfiltered `node runner.js` result remains the source of truth for overall status.
