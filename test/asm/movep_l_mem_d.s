main:
    nop
    movep.l 0(a0),d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x4e0100ff
    .dc.l 0
