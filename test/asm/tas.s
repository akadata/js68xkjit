main:
    nop
    tas d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x80
    .dc.l 0
