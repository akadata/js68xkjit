main:
    nop
    or.l #0xaaaaaaaa,d0
    or.l d0,d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
