main:
    nop
    bsr sub2
    rts
    sub2:
    rts
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
