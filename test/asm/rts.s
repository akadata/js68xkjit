main:
    nop
    bsr sub1
    rts
    sub1:
    rts
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
