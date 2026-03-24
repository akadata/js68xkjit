#!/bin/sh

set -eu

ADDR="${1:?usage: loadbin.sh <hex_addr> <bin_file> [entry_addr]}"
BIN_FILE="${2:?usage: loadbin.sh <hex_addr> <bin_file> [entry_addr]}"
ENTRY_ADDR="${3:-$ADDR}"

export J68_CPU_TYPE='68040'
export J68_MONITOR_EXIT_ON_MONITOR=0
export J68_AUDIO_BACKEND=${J68_AUDIO_BACKEND:-ffplay}
export J68_TIMER_MODE=${J68_TIMER_MODE:-PAL}

export J68_MONITOR_SCRIPT="load ${ADDR} ${BIN_FILE}\rg ${ENTRY_ADDR}\r"
export J68_MONITOR_EXIT_ON_MONITOR=1

node tools/monitor.js