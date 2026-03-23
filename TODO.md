# TODO.md

## Overview

This document captures the current state of the J68 CPU core (`js68xkjit`) and outlines what remains to reach architectural completeness.

The core is **functional, testable, and benchmarked**, however it is **not yet a fully complete 68k implementation**.

---

## What Exists Today

The CPU core (`src/j68.js`) implements a substantial portion of the Motorola 68k architecture across:

* 68000
* 68020
* 68030
* 68040 (partial behavioural model)

### Core Capabilities

* Full register set:

  * Data registers (D0–D7)
  * Address registers (A0–A7)
  * Program Counter (PC)
  * Status Register (SR) and CCR
  * User/Supervisor stack switching (USP/SSP)

* Execution engine:

  * Instruction fetch/decode/execute loop
  * Effective address decoding (multiple modes implemented)
  * Exception and trap handling framework

* Memory model:

  * 8/16/32-bit read/write paths
  * Stack operations and frame handling

* Instruction coverage (broad categories):

  * Integer arithmetic (ADD, SUB, ADDX, SUBX, NEG, NEGX, CMP, MUL, DIV)
  * Logical operations (AND, OR, EOR, NOT, CLR, TST)
  * Branching and flow control (BRA, Bcc, DBcc, JSR, RTS, RTE, etc.)
  * Data movement (MOVE, MOVEA, MOVEQ, MOVEM, MOVEP, MOVE16, MOVEC, MOVES)
  * Bit operations and bitfield instructions
  * Shift and rotate (register forms fully, memory forms partial)
  * System and supervisor instructions (partial set)

* Test suite:

  * 233 CPU test binaries in `test/asm` / `test/r`
  * 231 active passing
  * 0 active failures
  * 2 deferred invalid smoke tests (`CALLM` / `RTM`)
  * 114 filename roots in the current local CPU corpus
  * all 16 top-level opcode lines (`0`-`F`) have decode entry points in `src/j68.js`

---

## What This Means

The system is:

* A working 68k CPU core
* Deterministic and test-driven
* Capable of running and benchmarking across architectures

However it is **not yet architecturally complete**.

---

## Review Of The Current Core

The current local baseline is strong, but it is important not to overread
`231/233`.

What that number means:

* the local semantic corpus is in good shape
* the active failures are gone
* the core is usable for the machine and monitor work

What it does **not** mean:

* all instructions across all claimed CPU types are complete
* all effective-address forms are complete
* all 020/030/040 system behaviour is complete
* all currently passing instructions are deeply tested in every variant

There are still explicit executor holes and several semantic stubs in
`src/j68.js`.

### Explicit Executor Gaps Still Present In `src/j68.js`

These are the real code-level gaps visible from the current decoder/executor:

* incomplete effective-address handling:
  * generic `not impl ea mode`
  * generic `not impl dst ea mode`
  * 68020+ full-format extension word still marked TODO
* line 0 holes:
  * remaining unimplemented opmodes
  * `CALLM` / `RTM`
* line 4 holes / stubs:
  * `MOVEM` is still a stub
  * `NBCD` is still a stub
  * `ABCD` is still a stub
* line 5:
  * `ADDQ/SUBQ` still has unsupported mode paths
* line 8:
  * unsupported opmode paths remain
* line 9 / line D:
  * some `SUB` / `ADD` opmodes still fall through to `not impl`
* line B / line C:
  * some `CMP` / `AND` / related opmodes still fall through to `not impl`
* line E:
  * memory rotates are still not implemented
* bitfield / PMMU:
  * partial EA coverage
  * partial `PMOVE` mode coverage

### Semantic Stubs Hidden By Passing Counts

The following still need real implementation and stronger tests:

* `MOVEM`
* `NBCD`
* `ABCD`

These should not be treated as complete just because the local corpus currently
passes.

### TODOs That Are Now Out Of Date

The following old TODO statements are no longer accurate:

* memory shift instructions are no longer placeholders
  * `asl_m`
  * `asr_m`
  * `lsl_m`
  * `lsr_m`
  now have real tests and implementation

## Known Gaps and TODOs

### 1. CALLM / RTM

Status:

* Not failing due to CPU errors
* Current tests are invalid smoke tests

Missing:

* Proper module descriptor handling
* Valid stack/state handling for RTM

Next step:

* Build descriptor-backed fixtures
* Implement correct module semantics

---

### 2. FPU (68881 / 68882 / 68040 internal)

Status:

* Not implemented
* F-line currently acts as hook/trap

Missing:

* Floating-point instruction execution
* FPU state and register model

---

### 3. MMU

Status:

* Not implemented

Missing:

* Address translation
* Page tables / protection
* Fault handling

---

### 4. Division Edge Cases

Status:

* Partially implemented

Missing:

* Proper zero-divide exception behaviour
* Full edge-case correctness

---

### 5. Addressing Modes (020+ Full Format)

Status:

* Partially implemented

Missing:

* Full-format indexed addressing (68020/030/040)
* All displacement and scale variants

---

### 6. Memory Shift Instructions (Memory Forms)

Files:

* asl_m
* asr_m
* lsl_m
* lsr_m

Status:

* Implemented and tested

Remaining work:

* extend the same completeness to memory rotate forms

---

### 7. Cache / Alignment / Bus Behaviour

Status:

* Basic behaviour implemented

Missing:

* Accurate cache modelling (68030/68040)
* Alignment fault behaviour
* Bus error edge cases

---

### 8. Exception Accuracy

Status:

* Functional

Missing:

* Cycle-accurate exception frames
* Full compatibility with all CPU variants

### 9. CPU Test Source Portability

Status:

* cached/default CPU test runs are stable
* explicit source rebuild works on hosts with an Amiga-compatible assembler
* GNU `m68k-elf-as` is not sufficient for the whole current `test/asm` corpus

Examples:

* `abcd.s`
* `unpk.s`
* `movec_super.s`

Next step:

* either normalize `test/asm/*.s` to a GNU-compatible syntax subset
* or keep Amiga-compatible assembler as the explicit source-rebuild requirement

---

## Build System Status

The build system has been corrected and is now deterministic:

### Default Mode

* Runs from cached `.bin` files
* Fast execution

### Rebuild Mode

* Rebuilds from `.s` sources
* Uses Amiga-compatible assembler
* Source-of-truth validation

---

## Roadmap To Complete CPU Coverage

Complete coverage needs to be split into phases. Treating 68000, 68020, 68030,
and 68040 completeness as one flat task will hide the real order.

### Phase 1: Finish Base-Core Semantic Gaps

Goal:

* no executor stubs in the base integer/supervisor core for the tested corpus

Do next:

* implement real `MOVEM`
* implement real `NBCD`
* implement real `ABCD`
* implement memory rotates:
  * `ROL` memory
  * `ROR` memory
  * `ROXL` memory
  * `ROXR` memory
* close remaining `ADD` / `SUB` / `CMP` / `AND` / `OR` / `EOR` / `ADDQ` / `SUBQ`
  opmode fallthroughs
* add targeted tests for every current `not impl` branch in lines `0,4,5,8,9,B,C,D,E`

Success condition:

* no semantic stubs remain in the base integer core
* no untested local fallthroughs for currently claimed base instructions

### Phase 2: Finish 68020 Integer/Supervisor Completeness

Goal:

* make 68020 support real rather than partial

Do next:

* full-format indexed EA decoding
* `DIVSL` / `DIVUL`
* validate and harden:
  * `CAS`
  * `CAS2`
  * `CHK2`
  * `TRAPcc`
  * bitfields across more EA variants
* revisit `CALLM` / `RTM` only with authoritative descriptor/state fixtures

Success condition:

* 68020 integer/supervisor instruction set is substantially closed
* remaining gaps are clearly isolated to MMU/FPU/coprocessor areas

### Phase 3: 68030 / 68040 System Behaviour

Goal:

* move from opcode acceptance toward real 030/040 behaviour

Do next:

* broaden `PMOVE` mode coverage
* implement real PMMU state/translation behaviour
* harden cache-related instructions beyond privilege/no-op handling
* deepen `MOVE16`
* improve exception frame and alignment accuracy by CPU type

Success condition:

* 030/040 system instructions are no longer mostly structural placeholders

### Phase 4: Architectural Completeness Claims

Goal:

* only claim “complete coverage” when the large remaining architecture blocks are
  real

Do next:

* FPU / 68881 / 68882 / 68040 FP path
* MMU / PMMU translation model
* bus error and exception-model edge cases
* cache behaviour where architecturally visible

Success condition:

* “supports 68030/68040” means more than integer decode plus partial system ops

## Current Position

This project has reached a point where:

* The CPU core is real and operational
* The local semantic corpus is meaningful
* Placeholder scaffolding has been removed from the active local tests
* Performance is measurable and improving
* Build flow is controlled and intentional
* The next quality jump is no longer “make it run at all”
* The next quality jump is finishing the remaining semantic stubs and then
  closing 020+/030+/040 architectural gaps in order

---

## Summary

This is not a toy implementation.

It is a working 68k CPU core with a strong foundation, however:

> **It is not yet complete.**

Remaining work focuses on:

* Architectural completeness (FPU, MMU, CALLM/RTM)
* Edge-case correctness
* Extended addressing and system behaviour
* Continued performance improvements

---

## Guiding Principle

Correctness over assumption.

Tests must prove behaviour.

Placeholders do not belong.
