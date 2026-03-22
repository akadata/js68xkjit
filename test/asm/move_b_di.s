main:
    nop
    move.b #0x55,d0
    move.b d0,d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x55
    .dc.l 0
