main:
    nop
    or.w #0xaaaa,d0
    or.w d0,d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
