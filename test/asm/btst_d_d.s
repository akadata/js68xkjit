main:
    nop
    btst #0,d0
    btst d1,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
