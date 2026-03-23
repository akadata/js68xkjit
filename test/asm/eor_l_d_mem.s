main:
    lea data, %a0
    move.l #0xffffffff, %d0
    move.l #0xaaaaaaaa, %d2
    move.l %d2, (%a0)
    eor.l %d0, (%a0)
    move %ccr, %d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0xffffffff
    .dc.l 0xd1, 0x00000000
    .dc.l 0xd2, 0xaaaaaaaa
    .dc.l 0xe2, data, 0x55555555
    .dc.l 0

data:
    .dc.l 0
