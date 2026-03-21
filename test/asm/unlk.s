main:
    nop
    link a6,#-8
    unlk a6
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
