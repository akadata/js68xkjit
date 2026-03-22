main:
    nop
    moveq #8,d0
    moveq #3,d1
    sub.b d1,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 5
    .dc.l 0xd1, 3
    .dc.l 0
