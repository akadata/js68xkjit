main:
    nop
    dc.w 0xFFFF
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
