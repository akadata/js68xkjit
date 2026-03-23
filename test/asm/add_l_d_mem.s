main:
    lea data, %a0
    moveq #1, %d0
    move.l #0x7fffffff, %d2
    move.l %d2, (%a0)
    add.l %d0, (%a0)
    move %ccr, %d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x00000001
    .dc.l 0xd2, 0x7fffffff
    .dc.l 0xd1, 0x0000000a
    .dc.l 0xe2, data, 0x80000000
    .dc.l 0

data:
    .dc.l 0
