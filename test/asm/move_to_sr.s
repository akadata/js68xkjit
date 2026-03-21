main:
    nop
    move.w sr,d0
    move.w d0,sr
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
