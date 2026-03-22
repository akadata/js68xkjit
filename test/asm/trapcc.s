    .org 0x1c
    .dc.l trap_handler
    .org 0x100
main:
    dc.w 0x50fc  | TRAPT (no operand)
    moveq #1,d0
    bra check
trap_handler:
    moveq #7,d0
check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 7
    .dc.l 0xa7, 0x2ffa
    .dc.l 0xe1, 0x2ffa, 0x0015
    .dc.l 0xe2, 0x2ffc, 0x00000102
    .dc.l 0
