main:
    nop
    lea data,a0
    move.w #0xaaaa,d0
    eori.w #0x5555,d0
    eori.w #0x5555,(a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0xffff
    .dc.l 0xe1, data, 0x5a5a
    .dc.l 0

data:
    .dc.w 0x0f0f
