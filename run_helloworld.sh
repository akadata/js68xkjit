#!/bin/sh
export J68_MONITOR_SCRIPT='loadasm 00090000 helloworld.asm\ru 00090000\rg 00090000\r'
export J68_MONITOR_EXIT_ON_MONITOR=1
node tools/monitor.js
