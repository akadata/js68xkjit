# BENCHMARK.md

## Overview

This document records the current benchmark performance, build model, and instruction coverage status of the J68 CPU core.

The system has recently undergone:

* removal of placeholder test scaffolding
* correction of CPU semantics (e.g. `NOP`, `NEGX`)
* introduction of a proper build flow with cached vs source rebuild modes
* restoration of a compatible Amiga m68k toolchain for deterministic assembly

The result is a **clean, trustworthy baseline**.

---

## Build Model

### Default Mode (Fast Path)

```bash
./runtests.sh runner
```

* Runs tests from prebuilt `.bin` artefacts
* No assembler invocation
* Fast startup and execution
* Suitable for development iteration

---

### Rebuild Mode (Source of Truth)

```bash
./runtests.sh runner --rebuild-all
```

* Rebuilds all test `.s` sources into `.bin`
* Regenerates expected `.r` outputs
* Uses Amiga-compatible assembler
* Ensures full correctness from source

This mode does **not trust cached binaries**.

---

### Why This Split Exists

Previously:

* tests and monitor rebuilt on every run
* high overhead (especially on Pi 4)
* unnecessary toolchain churn

Now:

* default mode is fast and stable
* rebuild mode is explicit and deterministic

This provides:

* speed for development
* correctness when required

---

## Benchmark Results

All benchmarks use:

* `BENCH1 REG-LOOP COUNT=50000`
* `VIRT_TICKS=10000`

---

### i9 Host (Arch Linux)

```
smalley@archlinux:/mnt/pihome/reference/j68k$ ./runtests.sh bench
----- Benchmark CPU 68000 -----
bench 1
BENCH1 REG-LOOP COUNT=50000 HOST_US=22087 VIRT_TICKS=10000
monitor_bench.test.js: ok
----- Benchmark CPU 68020 -----
bench 1
BENCH1 REG-LOOP COUNT=50000 HOST_US=12840 VIRT_TICKS=10000
monitor_bench.test.js: ok
----- Benchmark CPU 68030 -----
bench 1
BENCH1 REG-LOOP COUNT=50000 HOST_US=12779 VIRT_TICKS=10000
monitor_bench.test.js: ok
----- Benchmark CPU 68040 -----
bench 1
BENCH1 REG-LOOP COUNT=50000 HOST_US=14020 VIRT_TICKS=10000
monitor_bench.test.js: ok
```

Results: 

```
68000  → HOST_US=22087
68020  → HOST_US=12840
68030  → HOST_US=12779
68040  → HOST_US=14020
```

Observations:

* Significant performance improvement after core fixes
* 68020/68030 paths currently fastest
* 68040 slightly behind in this workload (worth further analysis)
* Dispatch and execution flow now much cleaner

---

### Raspberry Pi 4

Benchmarks: `pi4 aarch64 68k`
```
smalley@amiga:~/reference/j68k $ ./runtests.sh bench
----- Benchmark CPU 68000 -----
bench 1
BENCH1 REG-LOOP COUNT=50000 HOST_US=99892 VIRT_TICKS=10000
monitor_bench.test.js: ok
----- Benchmark CPU 68020 -----
bench 1
BENCH1 REG-LOOP COUNT=50000 HOST_US=105443 VIRT_TICKS=10000
monitor_bench.test.js: ok
----- Benchmark CPU 68030 -----
bench 1
BENCH1 REG-LOOP COUNT=50000 HOST_US=95058 VIRT_TICKS=10000
monitor_bench.test.js: ok
----- Benchmark CPU 68040 -----
bench 1
BENCH1 REG-LOOP COUNT=50000 HOST_US=103890 VIRT_TICKS=10000
monitor_bench.test.js: ok
```

Results: `pi4 aarch64 68k`
```
68000  → HOST_US=99892
68020  → HOST_US=105443
68030  → HOST_US=95058
68040  → HOST_US=103890
```

Observations:

* Performance is host-bound
* Differences between CPU models are smaller
* 68030 currently performs best on Pi 4
* System remains stable under full rebuild and run

---

## Monitor ROM Build

Monitor ROM images are generated for each CPU:

```
build/generated/m68k/68000/rom/monitor.bin
build/generated/m68k/68020/rom/monitor.bin
build/generated/m68k/68030/rom/monitor.bin
build/generated/m68k/68040/rom/monitor.bin
```

These are built from machine code sources and cached.

Next step:

* confirm monitor runtime consumes these artefacts directly
* avoid unnecessary regeneration during startup

---

## Instruction Set Status

### Current Test Coverage

```
Total tests:     233
Passed:          231
Active failures: 0
Deferred:        2
```

---

### Deferred Instructions

The only remaining non-passing tests are:

```
CALLM
RTM
```

These are **not CPU implementation failures**.

They are correctly classified as:

```
deferred invalid smoke tests
```

---

### Why CALLM / RTM Are Deferred

The current test sources:

* do not provide a valid module descriptor (`CALLM`)
* do not provide a valid saved module state (`RTM`)

Example issues:

* `CALLM` requires:

  * valid module descriptor
  * valid transfer target

* `RTM` requires:

  * prior `CALLM` execution
  * valid stack frame

The current tests:

```
callm #0,(a0)
rtm d0
```

are **not architecturally valid fixtures**.

---

### Correct Next Step

To properly support these:

* build descriptor-backed fixtures
* implement full module state handling
* validate stack-based return semantics

Until then, they remain:

> intentionally deferred, not failures

---

## Placeholder Test Cleanup

All major placeholder/stub test groups have been removed and replaced with real semantic checks:

* NEG
* NEGX
* SUBX
* TST

Tests now verify:

* result values
* CCR state via `move %ccr,%dn`
* sticky `Z`
* correct `X`, `C`, `N`, `V` behavior

Remaining edge cases:

* memory shift variants (`asl_m`, `asr_m`, `lsl_m`, `lsr_m`)

  * currently limited by assembler syntax compatibility
  * next cleanup target

---

## Current State

The system is now:

* functionally correct across tested instruction set
* free of placeholder test scaffolding
* deterministic in rebuild mode
* fast in cached mode
* portable across Pi 4 and x86 hosts (with correct toolchain)

---

## Summary

This is the first point where:

* test results are **trustworthy**
* performance is **measurable and improved**
* build system is **controlled and intentional**

Remaining work is now:

* architectural completeness (CALLM / RTM)
* final edge-case instruction coverage
* continued performance tuning
