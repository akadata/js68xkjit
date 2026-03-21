main:
    nop
    suba.l #1,a0
    suba.l d0,a1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
