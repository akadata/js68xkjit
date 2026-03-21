# j68k CPU Instruction Implementation Tasks

This document tracks instruction coverage and implementation tasks across the Motorola 68K family and 68881/68882 FPU.

**Last Updated:** 2026-03-21  
**Total Assembly Tests:** 224 files  
**Build Status:** All build successfully with m68k-amigaos toolchain

---

## Coverage Legend

| Status | Meaning |
|--------|---------|
| [X] | Implemented in j68.js + test file exists |
| [T] | Test file exists (stub or partial) |
| [ ] | Missing - no test or implementation |
| [P] | Test file exists, implementation pending |

---

## MC68000 / MC68008 Base Set

### Data Movement Instructions

| Mnemonic | Variants | Test Files | Status | Notes |
|----------|----------|------------|--------|-------|
| MOVE | B/W/L all EA modes | move_*.s (16 files) | [X] | Core coverage |
| MOVEA | W/L | movea_w.s, movea_l.s | [X] | |
| MOVEQ | L | moveq_*.s (6 files) | [X] | |
| MOVEM | L/W | movem_l.s, movem_w.s | [P] | Stub implementation |
| MOVEP | W/L | movep_*.s (4 files) | [T] | Test exists |
| MOVE to CCR | - | move_to_ccr.s | [X] | 68010+ |
| MOVE from CCR | - | move_ccr_1.s | [X] | |
| MOVE to SR | - | move_to_sr.s | [X] | Privileged |
| MOVE from SR | - | move_from_sr.s | [X] | |
| MOVE to USP | - | move_to_usp.s | [X] | Privileged |
| MOVE from USP | - | move_from_usp.s | [X] | Privileged |
| MOVES | B/W/L | moves_b.s, moves_w.s, moves_l.s | [T] | 68010+ privileged |
| SWAP | - | swap.s | [X] | |
| EXG | Dn/Dn, An/An, Dn/An | exg_*.s (3 files) | [X] | |

### Integer Arithmetic

| Mnemonic | Variants | Test Files | Status | Notes |
|----------|----------|------------|--------|-------|
| ADD | B/W/L | add_b.s, add_w.s, add_l.s | [P] | Dn,Dn only |
| ADDA | W/L | adda_w.s, adda_l.s | [X] | |
| ADDI | B/W/L | addi_b.s, addi_w.s, addi_l.s | [T] | Test exists |
| ADDQ | B/W/L | addq_*.s (4 files) | [X] | |
| ADDX | B/W/L | addx_b.s, addx_w.s, addx_l.s | [T] | |
| SUB | B/W/L | sub_b.s, sub_w.s, sub_l.s | [P] | |
| SUBA | W/L | suba_w.s, suba_l.s | [X] | |
| SUBI | B/W/L | subi_b.s, subi_w.s, subi_l.s | [T] | Test exists |
| SUBQ | B/W/L | subq_*.s (3 files) | [X] | |
| SUBX | B/W/L | subx_b.s, subx_w.s, subx_l.s | [T] | |
| MULS | - | muls.s | [X] | |
| MULU | - | mulu.s | [X] | |
| DIVS | - | divs.s | [X] | |
| DIVU | - | divu.s | [X] | |
| DIVSL | L | - | [ ] | 68020+ |
| DIVUL | L | - | [ ] | 68020+ |
| NEG | B/W/L | neg_b.s, neg_w.s, neg_l.s | [X] | |
| NEGX | B/W/L | negx_b.s, negx_w.s, negx_l.s | [T] | |

### Logical Instructions

| Mnemonic | Variants | Test Files | Status | Notes |
|----------|----------|------------|--------|-------|
| AND | B/W/L | and_*.s (3 files) | [P] | |
| ANDI | B/W/L/CCR/SR | andi_*.s (5 files) | [T] | Test exists |
| OR | B/W/L | or_*.s (3 files) | [P] | |
| ORI | B/W/L/CCR/SR | ori_*.s (5 files) | [T] | Test exists |
| EOR | B/W/L | eor_*.s (3 files) | [P] | |
| EORI | B/W/L/CCR/SR | eori_*.s (5 files) | [T] | Test exists |
| NOT | B/W/L | not_b.s, not_w.s, not_l.s | [X] | |

### Shift and Rotate

| Mnemonic | Variants | Test Files | Status | Notes |
|----------|----------|------------|--------|-------|
| ASL | B/W/L reg/mem | asl_d.s, asl_m.s | [P] | |
| ASR | B/W/L reg/mem | asr_d.s, asr_m.s | [P] | |
| LSL | B/W/L reg/mem | lsl_d.s, lsl_m.s | [P] | |
| LSR | B/W/L reg/mem | lsr_d.s, lsr_m.s | [P] | |
| ROL | B/W/L reg/mem | rol_d.s | [P] | |
| ROR | B/W/L reg/mem | ror_d.s | [P] | |
| ROXL | B/W/L reg/mem | roxl_d.s | [P] | |
| ROXR | B/W/L reg/mem | roxr_d.s | [P] | |

### Bit Manipulation

| Mnemonic | Variants | Test Files | Status | Notes |
|----------|----------|------------|--------|-------|
| BTST | Dn/mem | btst_d_d.s | [P] | |
| BCLR | Dn/mem | bclr_d_d.s | [P] | |
| BSET | Dn/mem | bset_d_d.s | [P] | |
| BCHG | Dn/mem | bchg_d_d.s | [P] | |
| BFCHG | mem | bfchg.s | [T] | 68020+ stub |
| BFCLR | mem | bfclr.s | [T] | 68020+ stub |
| BFEXTS | mem | bfexts.s | [T] | 68020+ stub |
| BFEXTU | mem | bfextu.s | [T] | 68020+ stub |
| BFFFO | mem | bfffo.s | [T] | 68020+ stub |
| BFINS | mem | bfins.s | [T] | 68020+ stub |
| BFSET | mem | bfset.s | [T] | 68020+ stub |
| BFTST | mem | bftst.s | [T] | 68020+ stub |

### Program Control

| Mnemonic | Variants | Test Files | Status | Notes |
|----------|----------|------------|--------|-------|
| BRA | S/L | bra_*.s (3 files) | [X] | |
| BSR | S/L | bsr_s.s, bsr_l.s | [P] | |
| Bcc | 14 conditions | bcc_*.s (14 files) | [P] | All conditions |
| DBcc | - | dbra.s, dbcc.s | [P] | |
| Scc | 14 conditions | scc.s, seq.s, sne.s | [P] | Partial |
| JMP | - | jmp.s | [X] | |
| JSR | - | jsr.s | [X] | |
| RTS | - | rts.s | [X] | |
| RTR | - | rtr.s | [X] | |
| RTE | - | rte.s | [T] | Privileged |
| RTD | - | rtd.s | [T] | 68010+ |
| RTM | - | rtm.s | [T] | 68020+ stub |
| TRAP | #0-#15 | trap.s, trap_a.s | [X] | |
| TRAPV | - | trapv.s | [X] | |
| TRAPcc | - | trapcc.s | [T] | 68020+ stub |
| CHK | - | chk.s | [P] | |
| CHK2 | W/L | chk2_w.s, chk2_l.s | [T] | 68020+ |
| ILLEGAL | - | illegal.s | [T] | |
| BKPT | #0-#7 | bkpt.s | [T] | 68010+ |

### System Control

| Mnemonic | Variants | Test Files | Status | Notes |
|----------|----------|------------|--------|-------|
| STOP | - | stop.s | [X] | Privileged |
| RESET | - | reset.s | [X] | Privileged |
| NOP | - | nop.s | [X] | |
| TAS | - | tas.s | [X] | |
| LINK | - | link.s | [X] | |
| UNLK | - | unlk.s | [X] | |
| LEA | - | lea.s | [X] | |
| PEA | - | pea.s | [X] | |
| CLR | B/W/L | clr_b.s, clr_w.s, clr_l.s | [X] | |
| TST | B/W/L | tst_b.s, tst_w.s, tst_l.s | [X] | |
| EXT | W/L | ext_w.s, ext_l.s | [X] | |
| EXTB | L | extb.s | [T] | 68020+ |
| NBCD | - | nbcd.s | [T] | |
| SBCD | - | sbcd.s | [T] | |
| ABCD | - | abcd.s | [T] | |
| CMP | B/W/L | cmp_b.s, cmp_w.s, cmp_l.s | [P] | |
| CMPA | W/L | cmpa_w.s, cmpa_l.s | [P] | |
| CMPI | B/W/L | cmpi_b.s, cmpi_w.s, cmpi_l.s | [P] | |
| CMPM | B/W/L | cmpm_b.s, cmpm_w.s, cmpm_l.s | [T] | |

### 68020+ Coprocessor Interface

| Mnemonic | Variants | Test Files | Status | Notes |
|----------|----------|------------|--------|-------|
| cpBcc | - | - | [ ] | 68020+ coprocessor branch |
| cpDBcc | - | - | [ ] | 68020+ coprocessor loop |
| cpGEN | - | - | [ ] | 68020+ coprocessor generic |

---

## MC68020 Additional Instructions

| Mnemonic | Variants | Test Files | Status | Notes |
|----------|----------|------------|--------|-------|
| CALLM | - | callm.s | [T] | Stub (removed in 68040) |
| CAS | B/W/L | cas_b.s, cas_w.s, cas_l.s | [T] | Compare-and-swap |
| CAS2 | L | cas2_l.s | [T] | Dual compare-and-swap |
| PACK | - | pack.s | [T] | Data packing |
| UNPK | - | unpk.s | [T] | Data unpacking |

---

## MC68030 MMU Instructions

| Mnemonic | Variants | Test Files | Status | Notes |
|----------|----------|------------|--------|-------|
| PFLUSH | - | pflush.s | [T] | Flush TLB/cache |
| PFLUSHA | - | pflusha.s | [T] | Flush all TLB/cache |
| PLOAD | - | pload.s | [T] | Load TLB (68030 only) |
| PMOVE | - | pmove.s | [T] | Move TLB entry |
| PTEST | - | ptest.s | [T] | Test TLB translation |

---

## MC68040 Additional Instructions

| Mnemonic | Variants | Test Files | Status | Notes |
|----------|----------|------------|--------|-------|
| CINV | ic/dc/bc | cinv.s | [T] | Invalidate cache |
| CPUSH | ic/dc/bc | cpush.s | [T] | Push cache |
| MOVE16 | mem/mem, mem/reg | move16_*.s (2 files) | [T] | 16-byte block move |

---

## MC68881 / MC68882 FPU Instructions

### Basic Floating-Point Operations

| Mnemonic | Variants | Test Files | Status | Notes |
|----------|----------|------------|--------|-------|
| FABS | S/D/X | - | [ ] | Absolute value |
| FADD | S/D/X | - | [ ] | Addition |
| FSUB | S/D/X | - | [ ] | Subtraction |
| FMUL | S/D/X | - | [ ] | Multiplication |
| FDIV | S/D/X | - | [ ] | Division |
| FNEG | S/D/X | - | [ ] | Negate |
| FSQRT | S/D/X | - | [ ] | Square root |

### Transcendental Functions

| Mnemonic | Variants | Test Files | Status | Notes |
|----------|----------|------------|--------|-------|
| FSIN | - | - | [ ] | Sine |
| FCOS | - | - | [ ] | Cosine |
| FTAN | - | - | [ ] | Tangent |
| FASIN | - | - | [ ] | Arc sine |
| FACOS | - | - | [ ] | Arc cosine |
| FATAN | - | - | [ ] | Arc tangent |
| FSINCOS | - | - | [ ] | Sine and cosine |
| FSINH | - | - | [ ] | Hyperbolic sine |
| FCOSH | - | - | [ ] | Hyperbolic cosine |
| FTANH | - | - | [ ] | Hyperbolic tangent |
| FATANH | - | - | [ ] | Hyperbolic arc tangent |

### Exponential and Logarithmic

| Mnemonic | Variants | Test Files | Status | Notes |
|----------|----------|------------|--------|-------|
| FETOX | - | - | [ ] | e^x |
| FETOXM1 | - | - | [ ] | e^x - 1 |
| FLOG2 | - | - | [ ] | log2(x) |
| FLOGN | - | - | [ ] | ln(x) |
| FLOGNP1 | - | - | [ ] | ln(x+1) |
| FLOG10 | - | - | [ ] | log10(x) |
| FTENTOX | - | - | [ ] | 10^x |
| FTWOTOX | - | - | [ ] | 2^x |

### Data Movement

| Mnemonic | Variants | Test Files | Status | Notes |
|----------|----------|------------|--------|-------|
| FMOVE | S/D/X/P | - | [ ] | Move to/from FPU |
| FMOVECR | - | - | [ ] | Move constant |
| FMOVEM | - | - | [ ] | Move multiple FPU regs |
| FGETEXP | - | - | [ ] | Get exponent |
| FGETMAN | - | - | [ ] | Get mantissa |

### Comparison and Testing

| Mnemonic | Variants | Test Files | Status | Notes |
|----------|----------|------------|--------|-------|
| FCMP | - | - | [ ] | Compare |
| FTST | S/D/X/P | - | [ ] | Test |
| FINT | - | - | [ ] | Integer part |
| FINTRZ | - | - | [ ] | Integer truncate |

### Scaling and Modulo

| Mnemonic | Variants | Test Files | Status | Notes |
|----------|----------|------------|--------|-------|
| FSCALE | - | - | [ ] | Scale by exponent |
| FMOD | - | - | [ ] | Modulo |
| FREM | - | - | [ ] | Remainder |

### Single-Precision Extensions (68040+)

| Mnemonic | Variants | Test Files | Status | Notes |
|----------|----------|------------|--------|-------|
| FSGLDIV | - | - | [ ] | Single-precision divide |
| FSGLMUL | - | - | [ ] | Single-precision multiply |

### Control Instructions

| Mnemonic | Variants | Test Files | Status | Notes |
|----------|----------|------------|--------|-------|
| FBcc | 25 conditions | - | [ ] | FPU branch |
| FDBcc | - | - | [ ] | FPU loop |
| FScc | 25 conditions | - | [ ] | FPU set on condition |
| FTRAPcc | - | - | [ ] | FPU trap |
| FNOP | - | - | [ ] | FPU no-op |
| FSAVE | - | - | [ ] | Save FPU state |
| FRESTORE | - | - | [ ] | Restore FPU state |

### Current FPU Coverage

| Test File | Coverage | Notes |
|-----------|----------|-------|
| fline.s | F-line trap only | Basic trap path |

---

## Implementation Priority

### Phase 1: Complete 68000 Base (Highest Priority)
- [ ] ADD/SUB full EA modes + flags
- [ ] CMP full implementation
- [ ] AND/OR/EOR full EA modes
- [ ] Bcc all conditions (complete)
- [ ] Shift/rotate full implementation
- [ ] Bit operations (BTST/BCLR/BSET/BCHG)
- [ ] MOVEM complete implementation
- [ ] MULS/MULU flag handling

### Phase 2: 68010/68020 Core
- [ ] MOVEC/MOVES (privileged)
- [ ] RTD implementation
- [ ] EXTB implementation
- [ ] CAS/CAS2 implementation
- [ ] PACK/UNPK implementation
- [ ] CHK2/CMP2 implementation

### Phase 3: 68030 MMU
- [ ] PFLUSH/PFLUSHA
- [ ] PLOAD (68030 only)
- [ ] PMOVE
- [ ] PTEST

### Phase 4: 68040 Cache
- [ ] CINV
- [ ] CPUSH
- [ ] MOVE16

### Phase 5: FPU (68881/68882)
- [ ] FMOVE basic
- [ ] FADD/FSUB/FMUL/FDIV
- [ ] FNEG/FABS/FSQRT
- [ ] FCMP/FTST
- [ ] FBcc conditions
- [ ] Transcendental functions
- [ ] FSAVE/FRESTORE

---

## Files Reference

### Current Test Structure
```
test/
├── asm/           # 224 assembly source files
├── r/             # 224 compiled binary files
├── build.sh       # Build script (m68k-amigaos toolchain)
├── runner.js      # Test runner
├── gen_asm.py     # Test generator
└── COVERAGE.md    # Detailed coverage report
```

### Source
```
src/
└── j68.js         # Main emulator (needs instruction implementations)
```

---

## Notes

1. **Stub files** use `dc.w 0xFFFF` to trigger F-line trap for instructions requiring specific CPU features not available in the base assembler.

2. **Privileged instructions** (MOVEC, MOVES, STOP, RTE, etc.) require supervisor mode emulation.

3. **68040 FPU split**: Some FPU instructions are hardware-direct on 68040, others require software emulation via traps.

4. **ProcessorTests reference**: `/home/smalley/reference/ProcessorTests/680x0/68000/v1/` contains ~500,000 validation test cases.

5. **Addressing modes**: Current tests cover common modes; full EA coverage needed for complete validation.
