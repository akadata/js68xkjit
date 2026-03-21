main:
    nop
    asr.b #1,d0
    asr.w #1,d0
    asr.l #1,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
