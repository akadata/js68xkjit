    .org 0x100
main:
    lea data,a0
    moveq #0x4b,d1
    addq #8,d1
    addq #8,d1
    addq #8,d1
    addq #8,d1
    addq #8,d1
    addq #8,d1
    addq #8,d1
    addq #8,d1
    addq #8,d1
    addq #8,d1
    addq #8,d1
    addq #8,d1
    addq #8,d1
    addq #8,d1
    addq #8,d1
    addq #8,d1
    bfins d1,(a0){#12:#8}
check:
    .dc.l 0xffffffff
    .dc.l 0xe2, data, 0x012cb567
    .dc.l 0
data:
    .dc.l 0x01234567
