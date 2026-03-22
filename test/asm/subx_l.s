main:
    move #0x0004, %ccr
    move.l #5, %d0
    move.l #5, %d1
    subx.l %d1,%d0
    move %ccr, %d2
    move #0x0014, %ccr
    moveq #0, %d0
    moveq #0, %d1
    subx.l %d1,%d0
    move %ccr, %d3
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0xffffffff
    .dc.l 0xd2, 0x00000004
    .dc.l 0xd3, 0x00000019
    .dc.l 0
