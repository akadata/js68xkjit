    .org 0x100
main:
    lea data,a0
    bfset (a0){#12:#8}
check:
    .dc.l 0xffffffff
    .dc.l 0xe2, data, 0x012ff567
    .dc.l 0
data:
    .dc.l 0x01234567
