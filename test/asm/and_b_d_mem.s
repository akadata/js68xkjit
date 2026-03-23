main:
    lea data, %a0
    moveq #0x0f, %d0
    moveq #0x33, %d2
    move.b %d2, (%a0)
    and.b %d0, (%a0)
    move %ccr, %d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x0000000f
    .dc.l 0xd1, 0x00000000
    .dc.l 0xd2, 0x00000033
    .dc.l 0xe0, data, 0x03
    .dc.l 0

data:
    .dc.b 0
