        org $00090000

UART_DATA       equ $00DE0000
MONITOR_TRAP    equ $A000

start:
        move.l  #$1234ABCD,d0
        movea.l #UART_DATA,a1
        bsr.s   puthex32
        bsr.s   newline
        dc.w    MONITOR_TRAP

        include "work/programs/lib/console.inc"
