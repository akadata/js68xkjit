main:
    lea data, %a0
    moveq #1, %d0
    moveq #0, %d2
    move.l %d2, (%a0)
    sub.l %d0, (%a0)
    move %ccr, %d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x00000001
    .dc.l 0xd2, 0x00000000
    .dc.l 0xd1, 0x00000019
    .dc.l 0xe2, data, 0xffffffff
    .dc.l 0

data:
    .dc.l 0
