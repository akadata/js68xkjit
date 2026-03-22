main:
    nop
    addq.l #1,d0
    addq.l #7,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 8
    .dc.l 0
