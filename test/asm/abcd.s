main:
    moveq #0, %d0
    moveq #0, %d1
    move #0x0004, %ccr
    abcd %d1, %d0
    move %ccr, %d2
    move.b %d0, %d4
    moveq #0, %d0
    moveq #0, %d1
    move #0x0014, %ccr
    abcd %d1, %d0
    move %ccr, %d3
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x00000001
    .dc.l 0xd2, 0x00000004
    .dc.l 0xd3, 0x00000000
    .dc.l 0xd4, 0x00000000
    .dc.l 0
