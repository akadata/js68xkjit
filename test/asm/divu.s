main:
    nop
    move.l #100,d0
    moveq #10,d1
    divu d1,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 10
    .dc.l 0
