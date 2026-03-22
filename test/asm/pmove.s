    .cpu 68030
    .org 0x100
main:
    lea src,a0
    pmove (a0),tc
    lea dst,a1
    pmove tc,(a1)
check:
    .dc.l 0xffffffff
    .dc.l 0xa0, src
    .dc.l 0xa1, dst
    .dc.l 0xe2, dst, 0x00000000
    .dc.l 0xf20, 0x001f, 0x0015
    .dc.l 0
    .org 0x200
src:
    .dc.l 0x00000000
    .org 0x240
dst:
    .dc.l 0xdeadbeef
