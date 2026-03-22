main:
    nop
    cas.l d0,d1,(a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x4e710ed0
    .dc.l 0
