    .text
    .org 0
    .long 0x001fffc0
    .long 0x00f80080
    .org 0x68
    .long 0x00f8009a

    .org 0x80
start:
    move.w  #0x2000, %sr
    movea.l #0x00de0010, %a0
    moveq   #16, %d0
    move.l  %d0, (%a0)
    move.l  %d0, 4(%a0)
    moveq   #7, %d0
    move.l  %d0, 8(%a0)
loop:
    bra.s   loop

isr:
    movea.l #0x00090000, %a1
    move.l  (%a1), %d0
    addq.l  #1, %d0
    move.l  %d0, (%a1)
    rte
