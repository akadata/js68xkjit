main:
    nop
    move.b #0xff,d0
    move.b #0xf0,d1
    and.b #0x55,d0
    and.b d0,d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x55
    .dc.l 0xd1, 0x50
    .dc.l 0
