main:
    nop
    moveq #3,d0
    dbcc d0,lab2
    lab2:
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 3
    .dc.l 0
