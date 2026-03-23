main:
    move.l #0x11223344, %d0
    move.l #0x55667788, %d1
    move.l #0x99aabbcc, %a0
    move.l #0xddeeff00, %a1
    lea data+16, %a7
    movem.l %d0-%d1/%a0-%a1, -(%a7)
    moveq #0, %d0
    moveq #0, %d1
    move.l #0, %a0
    move.l #0, %a1
    movem.l (%a7)+, %d0-%d1/%a0-%a1
    move.l %a7, %d2
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x11223344
    .dc.l 0xd1, 0x55667788
    .dc.l 0xd2, data+16
    .dc.l 0xa0, 0x99aabbcc
    .dc.l 0xa1, 0xddeeff00
    .dc.l 0xe2, data+0, 0x11223344
    .dc.l 0xe2, data+4, 0x55667788
    .dc.l 0xe2, data+8, 0x99aabbcc
    .dc.l 0xe2, data+12, 0xddeeff00
    .dc.l 0

data:
    .dc.l 0, 0, 0, 0, 0
