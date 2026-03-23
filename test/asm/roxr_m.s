main:
    move #0x0010, %ccr
    lea data, %a0
    roxr (%a0)
    move %ccr, %d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x00000019
    .dc.l 0xe1, data, 0xc000
    .dc.l 0

data:
    .dc.w 0x8001
