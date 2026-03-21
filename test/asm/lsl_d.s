main:
    nop
    lsl.b #1,d0
    lsl.w #1,d0
    lsl.l #1,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
