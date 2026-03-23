#!/bin/sh

set -eu
export J68_MONITOR_SCRIPT='load 001A0000 coop_regs.bin\rg 001A0000\r'
export J68_MONITOR_EXIT_ON_MONITOR=1
node tools/monitor.js
