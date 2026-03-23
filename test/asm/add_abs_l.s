    .org 0x100
main:
    moveq #1,d0
    add.l data,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0x12345679
    .dc.l 0
    .org 0x180
data:
    .dc.l 0x12345678
