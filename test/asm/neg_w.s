main:
    move.w #1, %d0
    neg.w %d0
    move %ccr, %d1
    move.w %d0, %d3
    moveq #0, %d0
    neg.w %d0
    move %ccr, %d2
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x00000000
    .dc.l 0xd1, 0x00000019
    .dc.l 0xd2, 0x00000004
    .dc.l 0xd3, 0x0000ffff
    .dc.l 0
