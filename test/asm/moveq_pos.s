main:
    nop
    moveq #0,d0
    moveq #127,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
