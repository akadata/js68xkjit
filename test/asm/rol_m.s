main:
    move #0x0010, %ccr
    lea data, %a0
    rol (%a0)
    move %ccr, %d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x00000011
    .dc.l 0xe1, data, 0x0003
    .dc.l 0

data:
    .dc.w 0x8001
