main:
    lea data+4,%a7
    moveq #0x12,%d0
    move.b %d0,-(%a7)
    move.b (%a7)+,%d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x00000012
    .dc.l 0xd1, 0x00000012
    .dc.l 0xa7, data+4
    .dc.l 0xe0, data+2, 0x12
    .dc.l 0

data:
    .dc.l 0, 0
