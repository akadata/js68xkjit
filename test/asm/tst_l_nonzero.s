main:
    move #0x0010, %ccr
    move.l #0x0206fb93, %d0
    tst.l %d0
    move %ccr, %d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x0206fb93
    .dc.l 0xd1, 0x00000010
    .dc.l 0
