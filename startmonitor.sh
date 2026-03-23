#!/bin/sh
export J68_CPU_TYPE='68040'
#export J68_MONITOR_EXIT_ON_MONITOR=0
#export J68_AUDIO_BACKEND=${J68_AUDIO_BACKEND:-ffplay}
#export J68_TIMER_MODE=${J68_TIMER_MODE:-NTSC}
node tools/monitor.js
