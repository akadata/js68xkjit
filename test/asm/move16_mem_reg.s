    .cpu 68040
    .org 0x100
main:
    lea dst,a0
    move16 src,(a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xa0, dst
    .dc.l 0xe2, dst + 0,  0x10213243
    .dc.l 0xe2, dst + 4,  0x54657687
    .dc.l 0xe2, dst + 8,  0x98a9bacb
    .dc.l 0xe2, dst + 12, 0xdcedfe0f
    .dc.l 0
    .org 0x200
src:
    .dc.l 0x10213243
    .dc.l 0x54657687
    .dc.l 0x98a9bacb
    .dc.l 0xdcedfe0f
    .org 0x240
dst:
    .dc.l 0
    .dc.l 0
    .dc.l 0
    .dc.l 0
