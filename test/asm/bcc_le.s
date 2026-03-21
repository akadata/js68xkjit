main:
    nop
    ble lab16
    lab16:
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
