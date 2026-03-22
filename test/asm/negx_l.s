main:
    move #0x0004, %ccr
    moveq #0, %d0
    negx.l %d0
    move %ccr, %d1
    move #0x0014, %ccr
    negx.l %d0
    move %ccr, %d2

check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0xffffffff
    .dc.l 0xd1, 0x00000004
    .dc.l 0xd2, 0x00000019
    .dc.l 0
