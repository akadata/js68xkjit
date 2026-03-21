main:
    nop
    subq.l #1,d0
    subq.l #8,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
