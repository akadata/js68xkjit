main:
    nop
    move.l #0x55555555,d0
    move.l d0,d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x55555555
    .dc.l 0
