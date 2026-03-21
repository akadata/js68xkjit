main:
    nop
    bsr sub3
    rts
    sub3:
    rts
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
