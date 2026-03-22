main:
    nop
    move.w #0xffff,d0
    move.w #0xf0f0,d1
    and.w #0x5555,d0
    and.w d0,d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x5555
    .dc.l 0xd1, 0x5050
    .dc.l 0
