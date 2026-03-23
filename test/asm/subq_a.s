main:
    move #0x0015, %ccr
    movea.l #0x00001000, %a1
    subq.l #4, %a1
    move %ccr, %d0
check:
    .dc.l 0xffffffff
    .dc.l 0xa1, 0x00000ffc
    .dc.l 0xd0, 0x00000015
    .dc.l 0
