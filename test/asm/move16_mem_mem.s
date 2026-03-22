    .cpu 68040
    .org 0x100
main:
    lea src,a0
    lea dst,a1
    move16 (a0)+,(a1)+
check:
    .dc.l 0xffffffff
    .dc.l 0xa0, src + 16
    .dc.l 0xa1, dst + 16
    .dc.l 0xe2, dst + 0,  0x11223344
    .dc.l 0xe2, dst + 4,  0x55667788
    .dc.l 0xe2, dst + 8,  0x99aabbcc
    .dc.l 0xe2, dst + 12, 0xddeeff00
    .dc.l 0
    .org 0x200
src:
    .dc.l 0x11223344
    .dc.l 0x55667788
    .dc.l 0x99aabbcc
    .dc.l 0xddeeff00
    .org 0x240
dst:
    .dc.l 0
    .dc.l 0
    .dc.l 0
    .dc.l 0
