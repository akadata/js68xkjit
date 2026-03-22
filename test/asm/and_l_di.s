main:
    nop
    move.l #0xffffffff,d0
    move.l #0xf0f0f0f0,d1
    and.l #0x55555555,d0
    and.l d0,d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x55555555
    .dc.l 0xd1, 0x50505050
    .dc.l 0
