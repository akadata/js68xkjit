main:
    nop
    lea data,a0
    move.l #0xffffffff,d0
    andi.l #0x55555555,d0
    andi.l #0x55555555,(a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x55555555
    .dc.l 0xe2, data, 0x55555555
    .dc.l 0

data:
    .dc.l 0xffffffff
