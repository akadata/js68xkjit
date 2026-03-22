main:
    nop
    move.w #0x5555,d0
    move.w #0xaaaa,d1
    eor.w d0,d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x5555
    .dc.l 0xd1, 0xffff
    .dc.l 0
