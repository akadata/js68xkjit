main:
    nop
    bsr sub4
    rts
    nop
    nop
    nop
    nop
    nop
    nop
    nop
    nop
    sub4:
    rts
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
