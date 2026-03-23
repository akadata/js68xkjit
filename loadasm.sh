#!/bin/sh

set -eu

ADDR="${1:?usage: loadasm.sh <hex_addr> <asm_file> [entry_addr]}"
ASM_FILE="${2:?usage: loadasm.sh <hex_addr> <asm_file> [entry_addr]}"
ENTRY_ADDR="${3:-$ADDR}"

export J68_MONITOR_SCRIPT="loadasm ${ADDR} ${ASM_FILE}\ru ${ADDR}\rg ${ENTRY_ADDR}\r"
export J68_MONITOR_EXIT_ON_MONITOR=1

node tools/monitor.js