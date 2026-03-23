main:
    lea data, %a0
    move.l #0x00000f0f, %d0
    move.l #0x00003333, %d2
    move.l %d2, (%a0)
    lea data+2, %a0
    and.w %d0, (%a0)
    move %ccr, %d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x00000f0f
    .dc.l 0xd1, 0x00000000
    .dc.l 0xd2, 0x00003333
    .dc.l 0xe1, data+2, 0x0303
    .dc.l 0

data:
    .dc.l 0
