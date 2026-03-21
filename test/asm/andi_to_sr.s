main:
    nop
    ori #0x2000,sr
    andi #0x1fff,sr
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
