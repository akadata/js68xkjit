main:
    nop
    move.l a0,usp
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
