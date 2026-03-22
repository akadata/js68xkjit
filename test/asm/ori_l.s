main:
    nop
    lea data,a0
    move.l #0x0a0a0a0a,d0
    ori.l #0x55555555,d0
    ori.l #0x55555555,(a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x5f5f5f5f
    .dc.l 0xe2, data, 0x75757575
    .dc.l 0

data:
    .dc.l 0x30303030
