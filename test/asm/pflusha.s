    .cpu 68040
    .org 0x100
main:
    pflusha
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 6
    .dc.l 0xf20, 0x001f, 0x0015
    .dc.l 0
