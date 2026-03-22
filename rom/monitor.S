    .text
    .org 0
    .long 0x001fffc0
    .long 0x00f80008
start:
    movea.l #0x00de0000, %a0
    move.l  #0x6a36380a, %d0
    move.l  %d0, (%a0)
    .word   0xa000
idle:
    bra.s idle
