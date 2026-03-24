#!/bin/sh

set -eu

ADDR="${1:?usage: loadasm.sh <hex_addr> <asm_file> [entry_addr]}"
ASM_FILE="${2:?usage: loadasm.sh <hex_addr> <asm_file> [entry_addr]}"
ENTRY_ADDR="${3:-$ADDR}"

export J68_CPU_TYPE='68040'
export J68_MONITOR_EXIT_ON_MONITOR=0
export J68_AUDIO_BACKEND=${J68_AUDIO_BACKEND:-ffplay}
export J68_TIMER_MODE=${J68_TIMER_MODE:-PAL}

export J68_MONITOR_SCRIPT="loadasm ${ADDR} ${ASM_FILE}\ru ${ADDR}\rg ${ENTRY_ADDR}\r"
export J68_MONITOR_EXIT_ON_MONITOR=1

node tools/monitor.js