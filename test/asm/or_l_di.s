main:
    nop
    move.l #0x11111111,d1
    or.l #0xaaaaaaaa,d0
    or.l d0,d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0xaaaaaaaa
    .dc.l 0xd1, 0xbbbbbbbb
    .dc.l 0
