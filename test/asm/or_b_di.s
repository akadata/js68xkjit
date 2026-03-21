main:
    nop
    or.b #0xaa,d0
    or.b d0,d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
