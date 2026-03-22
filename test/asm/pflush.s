    .cpu 68040
    .org 0x100
main:
    lea data,a0
    pflush (a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 5
    .dc.l 0xa0, data
    .dc.l 0xf20, 0x001f, 0x0015
    .dc.l 0
data:
    .dc.l 0
