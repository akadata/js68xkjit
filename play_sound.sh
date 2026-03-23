#!/bin/sh
export J68_MONITOR_SCRIPT='load 00090000 audio_note.bin\rg 00090000\r'
export J68_MONITOR_EXIT_ON_MONITOR=1
export J68_AUDIO_BACKEND=${J68_AUDIO_BACKEND:-ffplay}
export J68_TIMER_MODE=${J68_TIMER_MODE:-PAL}
node tools/monitor.js
