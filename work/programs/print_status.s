        org $00090000

UART_DATA       equ $00DE0000
MONITOR_TRAP    equ $A000

start:
        movea.l #UART_DATA,a1

        movea.l #label_d0,a0
        move.l  #$1234ABCD,d0
        bsr.s   puts_hex32

        movea.l #label_pi,a0
        move.l  #$0003243C,d0
        bsr.s   puts_hex32

        dc.w    MONITOR_TRAP

label_d0:
        dc.b    'D0',0
        even

label_pi:
        dc.b    'PI16',0
        even

        include "work/programs/lib/console.inc"
