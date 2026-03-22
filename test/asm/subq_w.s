main:
    nop
    moveq #8,d0
    subq.w #3,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 5
    .dc.l 0
