main:
    move.l #0x11223344, %d0
    move.l #0x55667788, %d1
    lea data+8, %a7
    movem.w %d0-%d1, -(%a7)
    move.l %a7, %d2
check:
    .dc.l 0xffffffff
    .dc.l 0xd2, data+4
    .dc.l 0xe1, data+4, 0x3344
    .dc.l 0xe1, data+6, 0x7788
    .dc.l 0

data:
    .dc.l 0, 0, 0
