main:
    nop
    move.w d0,(a0)
    move.w (a0)+,d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
