#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
ASSEMBLER=/opt/amiga/bin/vasmm68k_mot
for src in work/programs/*.s; do
    base=$(basename "$src" .s)
    "$ASSEMBLER" -quiet -m68000 -Fbin -o "save/${base}.bin" "$src"
    echo "built save/${base}.bin"
done
