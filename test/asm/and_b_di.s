main:
    nop
    and.b #0x55,d0
    and.b d0,d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
