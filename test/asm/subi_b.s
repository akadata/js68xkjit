main:
    nop
    subi.b #0x55,d0
    subi.b #0x55,(a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
