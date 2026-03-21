main:
    nop
    cmp.w #1,d0
    cmp.w d0,d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
