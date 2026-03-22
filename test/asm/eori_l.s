main:
    nop
    lea data,a0
    move.l #0xaaaaaaaa,d0
    eori.l #0x55555555,d0
    eori.l #0x55555555,(a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0xffffffff
    .dc.l 0xe2, data, 0x5a5a5a5a
    .dc.l 0

data:
    .dc.l 0x0f0f0f0f
