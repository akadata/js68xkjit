main:
    nop
    cas.w d0,d1,(a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x4e71
    .dc.l 0
