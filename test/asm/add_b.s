main:
    nop
    move.b #5,d0
    move.b #3,d1
    add.b d1,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 8
    .dc.l 0xd1, 3
    .dc.l 0
