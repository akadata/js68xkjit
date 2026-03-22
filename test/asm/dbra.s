main:
    nop
    moveq #5,d0
    dbra d0,lab1
    lab1:
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 4
    .dc.l 0
