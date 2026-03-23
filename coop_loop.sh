#!/bin/sh
export J68_MONITOR_SCRIPT='load 001A0000 coop_regs.bin\rload 00130000 coop_regs.bin\rg 001A0000\rg 00130000\rg 001A0000\rg 00130000\rg 001A0000\rg 00130000\rg 001A0000\rg 00130000\r'
export J68_MONITOR_EXIT_ON_MONITOR=1
node tools/monitor.js
