main:
    nop
    bcc lab5
    lab5:
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
