main:
    movea.l #0x00002000, %a0
    move.l #0x12340000, %d1
    move.l #0x0000abcd, %d0
    move.w %d0, (%a0)
    move.w (%a0)+, %d1
check:
    .dc.l 0xffffffff
    .dc.l 0xa0, 0x00002002
    .dc.l 0xd0, 0x0000abcd
    .dc.l 0xd1, 0x1234abcd
    .dc.l 0
