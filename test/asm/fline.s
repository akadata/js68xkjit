main:
    nop
    .dc.w 0xf000
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
