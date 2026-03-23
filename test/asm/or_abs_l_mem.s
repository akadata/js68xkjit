    .org 0x100
main:
    moveq #1,d0
    or.l d0,data
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 1
    .dc.l 0xe2, data, 0x12345679
    .dc.l 0
    .org 0x180
data:
    .dc.l 0x12345678
