    .cpu 68030
    .org 0x100
main:
    lea src-4,a0
    pmove (4,a0),tc
    lea dst-4,a1
    pmove tc,(4,a1)
check:
    .dc.l 0xffffffff
    .dc.l 0xa0, src-4
    .dc.l 0xa1, dst-4
    .dc.l 0xe2, dst, 0x12345678
    .dc.l 0xf20, 0x001f, 0x0015
    .dc.l 0
    .org 0x200
src:
    .dc.l 0x12345678
    .org 0x240
dst:
    .dc.l 0xdeadbeef
