main:
    lea data, %a0
    moveq #1, %d0
    moveq #0x7f, %d2
    move.b %d2, (%a0)
    add.b %d0, (%a0)
    move %ccr, %d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x00000001
    .dc.l 0xd2, 0x0000007f
    .dc.l 0xd1, 0x0000000a
    .dc.l 0xe0, data, 0x80
    .dc.l 0

data:
    .dc.b 0
