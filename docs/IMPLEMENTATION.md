# j68k 68000 Implementation Status

## Current Status

- Source-of-truth runner status: `231/233` passing
- Legacy filtered subset status: `195/195` passing with `38` skipped via `phase1.skip`
- All current semantic tests pass
- The validated suite is complete for currently covered instruction families
- `CALLM/RTM` are explicitly deferred pending authoritative module-descriptor and module-state semantics
- `CALLM/RTM` are not claimed as covered instructions

See [COVERAGE.md](COVERAGE.md) and [PROGRESS.md](PROGRESS.md) for the maintained current-state record.

---

## Historical Inventory

The remainder of this file is a historical instruction/test inventory and should not be treated as the current source of truth for coverage status.

## Test Coverage

### Assembly Test Files: 161 tests covering all 68000 instructions

#### Line 0: Dynamic Bit/Logic (19 tests)
- btst_d_d, bchg_d_d, bclr_d_d, bset_d_d
- andi_to_ccr, andi_to_sr, ori_to_ccr, ori_to_sr, eori_to_ccr, eori_to_sr
- and_b_di, and_w_di, and_l_di
- or_b_di, or_w_di, or_l_di
- eor_b_di, eor_w_di, eor_l_di

#### Line 1-3: MOVE variants (13 tests)
- move_b_di, move_b_ai, move_b_pi
- move_w_di, move_w_ai
- move_l_di, move_l_ai, move_l_pi
- movea_l, movea_w

#### Line 4: Miscellaneous (36 tests)
- clr_b, clr_w, clr_l
- not_b, not_w, not_l
- neg_b, neg_w, neg_l
- negx_b, negx_w, negx_l
- tst_b, tst_w, tst_l
- tas, nbcd
- ext_w, ext_l, swap
- nop, reset, stop
- rts, rtr, trap, trapv
- jmp, jsr
- lea, pea
- link, unlk
- movem_l, movem_w
- move_to_sr, move_from_sr, move_to_ccr
- move_to_usp, move_from_usp
- chk

#### Line 5: ADDQ/SUBQ/DBcc/Scc (14 tests)
- addq_b, addq_w, addq_l
- subq_b, subq_w, subq_l
- scc, seq, sne
- dbra, dbcc

#### Line 6: Branches (18 tests)
- bra_s, bra_l
- bsr_s, bsr_l
- bcc_hi, bcc_ls, bcc_cc, bcc_cs
- bcc_ne, bcc_eq, bcc_vc, bcc_vs
- bcc_pl, bcc_mi, bcc_ge, bcc_lt, bcc_gt, bcc_le

#### Line 7: MOVEQ (2 tests)
- moveq_pos, moveq_neg

#### Line 8: Divide/BCD (3 tests)
- divs, divu, sbcd

#### Line 9: Subtract (11 tests)
- sub_b, sub_w, sub_l
- suba_w, suba_l
- subx_b, subx_w, subx_l

#### Line A: Trap (1 test)
- trap_a

#### Line B: Compare (9 tests)
- cmp_b, cmp_w, cmp_l
- cmpa_w, cmpa_l
- cmpi_b, cmpi_w, cmpi_l

#### Line C: Multiply/BCD/Exchange (6 tests)
- muls, mulu
- abcd
- exg_dd, exg_aa, exg_da

#### Line D: Add (11 tests)
- add_b, add_w, add_l
- adda_w, adda_l
- addx_b, addx_w, addx_l

#### Line E: Shift/Rotate (12 tests)
- asl_d, asr_d
- lsl_d, lsr_d
- rol_d, ror_d
- roxl_d, roxr_d
- asl_m, asr_m, lsl_m, lsr_m (NOP placeholders)

#### Line F: F-line (1 test)
- fline

### Legacy Tests (13 tests)
- addq_1, bra_1, bra_2, bra_3
- move_ccr_1, move_index_1, move_mem_1, move_reg_1
- moveq_1, moveq_2, moveq_3, moveq_4
- subal_1

## CPU Generation Classification

### 68000 (Base - 73 instructions) ✓ Test coverage complete
All instructions have assembly test files.

### 68010 Additions
- MOVE from SR (changed from privileged to unprivileged)
- MOVE to CCR (new unprivileged instruction) ✓
- MOVE from USP (privileged) ✓
- MOVE to USP (privileged) ✓
- Enhanced RTE for virtual memory

### 68020 Additions
- Bitfield instructions (BFxxx)
- CALLM, RTM
- CAS, CAS2
- CHK2, CMP2
- Extended multiply/divide
- PACK, UNPK
- TRAPcc
- 32-bit displacements

### 68030 Additions
- PFLUSH, PTEST
- CPUSH, CINV
- MOVE16

### 68040 Additions
- Integrated FPU
- Enhanced CAS/CAS2
- CPUSHL

## Implementation Status

### Implemented (in j68.js)
| Instruction | Status | Test |
|-------------|--------|------|
| MOVEQ | ✓ | moveq_1, moveq_pos, moveq_neg |
| MOVE.L | Partial | move_l_di |
| MOVEA.L | Partial | movea_l |
| ADDQ | ✓ | addq_1, addq_b, addq_w, addq_l |
| BRA | ✓ | bra_1, bra_s, bra_l |
| BSR | Partial | bsr_s, bsr_l |
| DIVS | ✓ | divs |
| SUBA.L | ✓ | subal_1, suba_l |
| ADDA.L | ✓ | adda_l |
| F-line | ✓ | fline, trap_a |
| NOP | ✓ | nop |
| RTS | ✓ | rts |

### Not Yet Implemented (~60 instructions)
- MOVE (all EA modes for b/w/l)
- ADD, SUB (all sizes)
- CMP (all sizes)
- AND, OR, EOR (all sizes)
- Bcc (all conditions)
- DBcc, Scc
- CLR, TST, NOT, NEG, NEGX
- EXT, SWAP
- JMP, JSR, RTR
- LINK, UNLINK
- LEA, PEA
- MOVEM
- MULS, MULU, DIVU
- ASL, ASR, LSL, LSR, ROL, ROR, ROXL, ROXR
- BTST, BCLR, BSET, BCHG
- CHK, TRAPV
- ABCD, SBCD, NBCD
- EXG
- ADDX, SUBX
- MOVE to/from SR, CCR, USP

## Build System

### Toolchain
- Assembler: `/opt/amiga/bin/m68k-amigaos-as`
- Objcopy: `/opt/amiga/bin/m68k-amigaos-objcopy`

### Build Command
```sh
env PATH=/opt/amiga/bin:$PATH sh test/build.sh
```

### Test Files
- 161 assembly source files in `asm/`
- 161 compiled binary files in `r/`
- test.list generated automatically

## Next Steps

1. **Implement MOVE variants** - Complete all EA modes (highest priority)
2. **Implement ADD/SUB/CMP** - All sizes and EA modes
3. **Implement logic operations** - AND, OR, EOR
4. **Implement branches** - All Bcc conditions
5. **Implement line 4** - CLR, TST, NOT, NEG, EXT, SWAP, etc.
6. **Run ProcessorTests** - Validate against comprehensive test suite
7. **Fix bra_2 bug** - Backward branch PC calculation issue

## Files

- `src/j68.js` - Main emulator (611 lines)
- `test/build.sh` - Build script
- `test/runner.js` - Local test runner
- `test/processor_runner.js` - ProcessorTests runner
- `test/gen_asm.py` - Assembly test generator
- `test/instruction_meta.json` - Instruction metadata
- `test/IMPLEMENTATION.md` - This file
