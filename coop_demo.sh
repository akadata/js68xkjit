#!/bin/sh

set -eu
export J68_MONITOR_SCRIPT='load 00190000 coop_demo.bin\rg 00190000\r'
export J68_MONITOR_EXIT_ON_MONITOR=1
node tools/monitor.js
