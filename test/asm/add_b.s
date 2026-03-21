main:
    nop
    addq.b #1,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 1
    .dc.l 0
