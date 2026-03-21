main:
    nop
    eori.l #0x55555555,d0
    eori.l #0x55555555,(a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
