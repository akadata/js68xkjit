main:
    nop
    lsr.b #1,d0
    lsr.w #1,d0
    lsr.l #1,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
