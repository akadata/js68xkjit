main:
    nop
    move.b d0,(a0)
    move.b (a0)+,d1
    move.b -(a0),d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
