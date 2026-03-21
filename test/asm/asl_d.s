main:
    nop
    asl.b #1,d0
    asl.w #1,d0
    asl.l #1,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
