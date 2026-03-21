main:
    nop
    andi.w #0x5555,d0
    andi.w #0x5555,(a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
