    .org 0x100
main:
    lea data,a0
    moveq #0x12,d0
    moves.b d0,(a0)
    moveq #0,d1
    moves.b (a0),d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd1, 0x12
    .dc.l 0xe0, data, 0x12
    .dc.l 0
data:
    .dc.l 0x55667788
