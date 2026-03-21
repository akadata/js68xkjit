main:
    nop
    beq lab8
    beq lab8
    lab8:
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
