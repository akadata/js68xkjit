    .org 0x100
main:
    lea data,a0
    bfclr (a0){#12:#8}
check:
    .dc.l 0xffffffff
    .dc.l 0xe2, data, 0x01200567
    .dc.l 0
data:
    .dc.l 0x01234567
