main:
    nop
    bpl skip
    addq.l #1,d0
skip:
    nop
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
