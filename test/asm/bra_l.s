main:
    nop
    bra lab2
    nop
    nop
    nop
    nop
    nop
    nop
    nop
    nop
    lab2:
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
