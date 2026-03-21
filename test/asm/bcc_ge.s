main:
    nop
    bge lab13
    lab13:
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
