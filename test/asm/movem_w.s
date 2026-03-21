main:
    nop
    movem.w d0-d1,-(sp)
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
