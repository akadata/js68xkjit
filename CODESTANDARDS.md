# codestandards.md

## Demo Source Policy

All demos are source-first.

Every demo or program must begin life as human-readable `.asm` source and be stored as source.

Binary files such as `.bin` are build artifacts only. They are not source of truth.

The authoritative chain is:

```text
.asm -> assembler -> .bin -> load
```

For small monitor-safe demos, this may also be valid:

```text
.asm -> loadasm -> memory
```

What must never become the source chain is:

```text
.bin -> guessed pseudo-source -> confusion
```

## Hard Rules

* Every program or demo must exist as `.asm` source.
* `.bin` files are generated artifacts only.
* No checked-in hand-authored raw machine code blobs.
* No monitor-only pseudo-source as the primary source of truth.
* `loadasm` is a convenience subset, not the authoritative build path.
* If a demo exceeds the monitor assembler subset, it still begins as `.asm`, is built externally, and is loaded with `load`.
* the monitor must assemble and disassemble its own instruction set, we must *NOT* use external m68k assembler/objcopy.

## Codex Rule

Codex must always create or modify `.asm` source.

Codex must not invent or hand-write binary files as source.

Codex must not treat disassembled machine words as canonical source.

Codex may update build scripts that compile `.asm` into `.bin`, however the source of truth remains the assembler source.

## Demo Categories

### Monitor-safe demos

These are intended to work with `loadasm`.

They should remain small and stay within the explicitly supported monitor assembler subset.

### Full demos

These are proper `.asm` source programs which may exceed the monitor subset.

They must be assembled externally into `.bin` and loaded through `load`.

## Monitor Assembler Policy

The monitor assembler must be kept aligned with the supported subset of instructions and constructs used by small interactive demos.

It does not need to become a full external assembler.

Its supported subset should be documented clearly and extended deliberately, one feature family at a time.

## Guiding Principle

Source first.

Assembler is truth.

Binaries are artifacts.

