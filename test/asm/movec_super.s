    .org 0x100
main:
    moveq #5,d0
    movec d0,cacr
    moveq #0,d1
    movec cacr,d1
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 5
    .dc.l 0xd1, 5
    .dc.l 0
