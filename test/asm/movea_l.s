main:
    nop
    movea.l #0x12345678,a0
    movea.l d0,a1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
