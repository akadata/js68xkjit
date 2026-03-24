#!/bin/sh

set -eu

export J68_CPU_TYPE='68040'
export J68_MONITOR_EXIT_ON_MONITOR=0
export J68_AUDIO_BACKEND=${J68_AUDIO_BACKEND:-ffplay}
export J68_TIMER_MODE=${J68_TIMER_MODE:-PAL}

export J68_MONITOR_SCRIPT='load 00190000 coop_demo.bin\rg 00190000\r'
export J68_MONITOR_EXIT_ON_MONITOR=1
node tools/monitor.js
