main:
    nop
    pack d0,d1,#0x0000
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
