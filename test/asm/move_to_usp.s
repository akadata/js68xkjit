main:
    nop
    move.l a7,a0
    move.l a0,a7
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
