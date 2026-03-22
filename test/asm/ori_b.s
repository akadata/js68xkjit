main:
    nop
    lea data,a0
    move.b #0x0a,d0
    ori.b #0x55,d0
    ori.b #0x55,(a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x5f
    .dc.l 0xe0, data, 0x75
    .dc.l 0

data:
    .dc.w 0x3000
