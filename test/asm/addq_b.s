main:
    nop
    addq.b #1,d0
    addq.b #8,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
