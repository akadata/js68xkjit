    .org 0x20
    .dc.l priv_handler
    .org 0x100
main:
    lea data,a0
    moveq #0x12,d0
    moves.b d0,(a0)
    moveq #1,d0
    bra check
priv_handler:
    moveq #8,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 8
    .dc.l 0xa7, 0x2ffa
    .dc.l 0xe1, 0x2ffa, 0x0000
    .dc.l 0xe2, 0x2ffc, 0x00000106
    .dc.l 0xe0, data, 0x55
    .dc.l 0xf20, 0x2000, 0x2000
    .dc.l 0
data:
    .dc.l 0x55667788
