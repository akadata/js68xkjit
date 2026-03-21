main:
    nop
    cas2.l d0:d1,d2:d3,(a0):(a1)
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
