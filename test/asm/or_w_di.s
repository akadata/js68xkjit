main:
    nop
    move.w #0x1111,d1
    or.w #0xaaaa,d0
    or.w d0,d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0xaaaa
    .dc.l 0xd1, 0xbbbb
    .dc.l 0
