main:
    nop
    lea data,a0
    move.b #0xaa,d0
    eori.b #0x55,d0
    eori.b #0x55,(a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0xff
    .dc.l 0xe0, data, 0x5a
    .dc.l 0

data:
    .dc.w 0x0f00
