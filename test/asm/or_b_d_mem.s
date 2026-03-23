main:
    lea data, %a0
    moveq #1, %d0
    move.b #0x80, %d2
    move.b %d2, (%a0)
    or.b %d0, (%a0)
    move %ccr, %d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x00000001
    .dc.l 0xd1, 0x00000008
    .dc.l 0xd2, 0x00000080
    .dc.l 0xe0, data, 0x81
    .dc.l 0

data:
    .dc.b 0
