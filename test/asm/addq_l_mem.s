    .org 0x100
main:
    lea data,a0
    addq.l #5,(a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xa0, data
    .dc.l 0xe2, data, 0x0000000c
    .dc.l 0xf20, 0x001f, 0x0000
    .dc.l 0
    .org 0x180
data:
    .dc.l 0x00000007
