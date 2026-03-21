main:
    nop
    move.w #5,d0
    move.w #3,d1
    add.w d1,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 8
    .dc.l 0xd1, 3
    .dc.l 0
