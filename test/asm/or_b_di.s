main:
    nop
    move.b #0x11,d1
    or.b #0xaa,d0
    or.b d0,d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0xaa
    .dc.l 0xd1, 0xbb
    .dc.l 0
