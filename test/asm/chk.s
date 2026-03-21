main:
    nop
    moveq #5,d0
    chk #10,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
