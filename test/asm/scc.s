main:
    nop
    scc d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0xff
    .dc.l 0
