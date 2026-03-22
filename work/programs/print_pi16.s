        org $00090000

UART_DATA       equ $00DE0000
MONITOR_TRAP    equ $A000
FIX4            equ 262144
FIX3            equ 196608
PAIR_COUNT      equ 8

start:
        movea.l #UART_DATA,a1
        move.l  #FIX3,d0
        move.w  #2,d1
        move.w  #PAIR_COUNT-1,d7

pair_loop:
        bsr.s   term_n
        add.l   d3,d0
        addq.w  #2,d1

        bsr.s   term_n
        sub.l   d3,d0
        addq.w  #2,d1

        dbra    d7,pair_loop

        bsr.s   print_fixed16
        bsr.s   newline
        dc.w    MONITOR_TRAP

term_n:
        move.w  d1,d2
        move.w  d1,d3
        addq.w  #1,d3
        mulu    d3,d2
        move.w  d1,d3
        addq.w  #2,d3
        mulu    d3,d2
        move.l  #FIX4,d3
        divu    d2,d3
        move.w  d3,d4
        clr.l   d3
        move.w  d4,d3
        rts

print_fixed16:
        move.l  d0,d5
        move.l  d5,d1
        swap    d1
        andi.l  #$0000FFFF,d1
        bsr.s   putdigit
        moveq   #46,d0
        bsr.s   putc

        moveq   #0,d2
        move.w  d5,d2
        moveq   #4,d7

frac_loop:
        moveq   #10,d3
        mulu    d3,d2
        move.l  d2,d1
        swap    d1
        andi.l  #$0000FFFF,d1
        bsr.s   putdigit
        andi.l  #$0000FFFF,d2
        dbra    d7,frac_loop
        rts

putdigit:
        lea     digits,a2

putdigit_loop:
        tst.w   d1
        beq.s   putdigit_emit
        move.b  (a2)+,d0
        subq.w  #1,d1
        bra.s   putdigit_loop

putdigit_emit:
        move.b  (a2),d0
        bsr.s   putc
        rts

digits:
        dc.b    '0123456789'

        include "work/programs/lib/console.inc"
