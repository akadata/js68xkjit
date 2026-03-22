    .org 0x100
main:
    movec cacr,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 5
    .dc.l 0
