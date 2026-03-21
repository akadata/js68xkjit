main:
    nop
    clr.b d0
    clr.b (a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
