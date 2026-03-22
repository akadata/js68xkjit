main:
    nop
    not.l d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0xffffffff
    .dc.l 0
