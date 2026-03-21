main:
    nop
    lea 8(a0),a1
    lea (a0),a1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
