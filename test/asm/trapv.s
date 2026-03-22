main:
    nop
    moveq #1,d0
    addq.l #1,d0
    trapv
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 2
    .dc.l 0
