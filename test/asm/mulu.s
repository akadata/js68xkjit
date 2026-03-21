main:
    nop
    moveq #10,d0
    moveq #5,d1
    mulu d1,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
