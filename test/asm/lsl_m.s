main:
    lea data,%a0
    lsl (%a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xe1, data, 0x8002
    .dc.l 0

data:
    .dc.w 0x4001
