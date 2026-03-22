    .org 0x100
main:
    move.l #0x11223344,-(sp)
    move.l #after,-(sp)
    rtd #4
after:
    moveq #7,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xa7, 0x2000
    .dc.l 0xd0, 7
    .dc.l 0
