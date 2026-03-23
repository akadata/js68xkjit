    .org 0x100
main:
    lea src,a0
    lea dst,a1
    moveq #2,d2
    moveq #0,d3
    moveq #0,d4
    .dc.w 0x4cf0, 0x0018, 0x2b20, 0x0008
    .dc.w 0x48f1, 0x0018, 0x2b20, 0x0008
check:
    .dc.l 0xffffffff
    .dc.l 0xd2, 2
    .dc.l 0xd3, 0x11223344
    .dc.l 0xd4, 0x55667788
    .dc.l 0xe2, dst+12, 0x11223344
    .dc.l 0xe2, dst+16, 0x55667788
    .dc.l 0
src:
    .dc.l 0, 0, 0, 0x11223344, 0x55667788
    .dc.l 0x99aabbcc, 0xddeeff00
dst:
    .dc.l 0, 0, 0, 0, 0, 0, 0
