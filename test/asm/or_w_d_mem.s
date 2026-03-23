main:
    lea data, %a0
    moveq #1, %d0
    move.l #0x00008000, %d2
    move.l %d2, (%a0)
    lea data+2, %a0
    or.w %d0, (%a0)
    move %ccr, %d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x00000001
    .dc.l 0xd1, 0x00000008
    .dc.l 0xd2, 0x00008000
    .dc.l 0xe1, data+2, 0x8001
    .dc.l 0

data:
    .dc.l 0
