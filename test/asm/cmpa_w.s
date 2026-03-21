main:
    nop
    cmpa.w #1,a0
    cmpa.w d0,a1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
