main:
    move #0x0000, %ccr
    move.l #0x00000081, %d0
    asl.b #1, %d0
    move %ccr, %d1
    move.l %d0, %d4
    move #0x0000, %ccr
    move.l #0x00008001, %d0
    asl.w #1, %d0
    move %ccr, %d2
    move.l %d0, %d5
    move #0x0000, %ccr
    move.l #0x80000001, %d0
    asl.l #1, %d0
    move %ccr, %d3
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x00000002
    .dc.l 0xd1, 0x00000013
    .dc.l 0xd2, 0x00000013
    .dc.l 0xd3, 0x00000013
    .dc.l 0xd4, 0x00000002
    .dc.l 0xd5, 0x00000002
    .dc.l 0
