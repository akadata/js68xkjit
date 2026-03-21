main:
    nop
    sne d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
