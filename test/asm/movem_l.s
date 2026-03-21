main:
    nop
    movem.l d0-d1/a0-a1,-(sp)
    movem.l (sp)+,d0-d1/a0-a1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
