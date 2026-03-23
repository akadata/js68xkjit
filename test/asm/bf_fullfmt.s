    .org 0x100
main:
    lea data,a0
    moveq #2,d2
    .dc.w 0xe9f0, 0x4308, 0x2b20, 0x0008
    moveq #0x4b,d3
    addq #8,d3
    addq #8,d3
    addq #8,d3
    addq #8,d3
    addq #8,d3
    addq #8,d3
    addq #8,d3
    addq #8,d3
    addq #8,d3
    addq #8,d3
    addq #8,d3
    addq #8,d3
    addq #8,d3
    addq #8,d3
    addq #8,d3
    addq #8,d3
    .dc.w 0xeff0, 0x3308, 0x2b20, 0x0008
check:
    .dc.l 0xffffffff
    .dc.l 0xd2, 2
    .dc.l 0xd4, 0x34
    .dc.l 0xe2, data+12, 0x012cb567
    .dc.l 0
    .dc.l 0, 0, 0
data:
    .dc.l 0, 0, 0, 0x01234567
