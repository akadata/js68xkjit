main:
    nop
    movea.w #0x1234,a0
    movea.w d0,a1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
