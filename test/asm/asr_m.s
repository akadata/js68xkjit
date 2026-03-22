main:
    lea data,%a0
    asr (%a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xe1, data, 0xc000
    .dc.l 0

data:
    .dc.w 0x8001
