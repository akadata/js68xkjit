main:
    nop
    move.b #0x55,d0
    move.b #0xaa,d1
    eor.b d0,d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x55
    .dc.l 0xd1, 0xff
    .dc.l 0
