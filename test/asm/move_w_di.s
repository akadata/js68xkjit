main:
    nop
    move.w #0x5555,d0
    move.w d0,d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
