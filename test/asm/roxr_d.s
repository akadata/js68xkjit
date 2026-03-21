main:
    nop
    roxr.b #1,d0
    roxr.w #1,d0
    roxr.l #1,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
