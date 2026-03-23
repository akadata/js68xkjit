main:
    lea data, %a0
    move.b #0xff, %d0
    move.b #0xaa, %d2
    move.b %d2, (%a0)
    eor.b %d0, (%a0)
    move %ccr, %d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x000000ff
    .dc.l 0xd1, 0x00000000
    .dc.l 0xd2, 0x000000aa
    .dc.l 0xe0, data, 0x55
    .dc.l 0

data:
    .dc.b 0
