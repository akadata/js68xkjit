    .org 0x100
main:
    lea data,a0
    bfexts (a0){#12:#8},d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd1, 0xffffffc4
    .dc.l 0
data:
    .dc.l 0x012c4567
