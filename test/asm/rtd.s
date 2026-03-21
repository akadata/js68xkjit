main:
    nop
    rtd #4
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
