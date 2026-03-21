main:
    nop
    clr.l d0
    clr.l (a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
