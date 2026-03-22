main:
    nop
    not.w d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0xffff
    .dc.l 0
