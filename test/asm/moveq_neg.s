main:
    nop
    moveq #-1,d0
    moveq #-128,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0xffffff80
    .dc.l 0
