main:
    nop
    move.l #0x12345678,d0
    swap d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x56781234
    .dc.l 0
