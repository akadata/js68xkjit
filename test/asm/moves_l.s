    .org 0x100
main:
    lea data,a0
    move.l #0x12345678,d0
    moves.l d0,(a0)
    moveq #0,d1
    moves.l (a0),d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd1, 0x12345678
    .dc.l 0xe2, data, 0x12345678
    .dc.l 0
data:
    .dc.l 0x55667788
