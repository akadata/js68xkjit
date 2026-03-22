    .org 0x100
main:
    lea data,a0
    bftst (a0){#12:#8}
check:
    .dc.l 0xffffffff
    .dc.l 0xf20, 0x000c, 0x0000
    .dc.l 0
data:
    .dc.l 0x01234567
