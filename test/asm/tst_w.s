main:
    move #0x0010, %ccr
    move.l #0x12348000, %d0
    tst.w %d0
    move %ccr, %d1
    move #0x0010, %ccr
    move.l #0x12340000, %d0
    tst.w %d0
    move %ccr, %d2
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x12340000
    .dc.l 0xd1, 0x00000018
    .dc.l 0xd2, 0x00000014
    .dc.l 0
