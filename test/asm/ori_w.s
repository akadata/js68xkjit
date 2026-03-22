main:
    nop
    lea data,a0
    move.w #0x0a0a,d0
    ori.w #0x5555,d0
    ori.w #0x5555,(a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x5f5f
    .dc.l 0xe1, data, 0x7575
    .dc.l 0

data:
    .dc.w 0x3030
