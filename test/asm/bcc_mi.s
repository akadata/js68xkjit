main:
    nop
    bmi lab12
    lab12:
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
