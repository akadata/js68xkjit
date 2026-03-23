#!/bin/sh

set -eu

ADDR="${1:?usage: loadbin.sh <hex_addr> <bin_file> [entry_addr]}"
BIN_FILE="${2:?usage: loadbin.sh <hex_addr> <bin_file> [entry_addr]}"
ENTRY_ADDR="${3:-$ADDR}"

export J68_MONITOR_SCRIPT="load ${ADDR} ${BIN_FILE}\rg ${ENTRY_ADDR}\r"
export J68_MONITOR_EXIT_ON_MONITOR=1

node tools/monitor.js