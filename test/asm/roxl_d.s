main:
    nop
    roxl.b #1,d0
    roxl.w #1,d0
    roxl.l #1,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
