    .org 0x100
main:
    lea data,a0
    move.w #0x1234,d0
    moves.w d0,(a0)
    moveq #0,d1
    moves.w (a0),d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd1, 0x1234
    .dc.l 0xe1, data, 0x1234
    .dc.l 0
data:
    .dc.l 0x55667788
