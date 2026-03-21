main:
    nop
    bne lab7
    lab7:
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
