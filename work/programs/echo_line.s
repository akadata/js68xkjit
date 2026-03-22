        org $00090000

UART_DATA       equ $00DE0000
UART_STATUS     equ $00DE0004
MONITOR_TRAP    equ $A000

start:
        movea.l #UART_DATA,a1
        movea.l #UART_STATUS,a2

        bsr     put_prompt

        movea.l #line_buffer,a0
        move.w  #31,d7
        bsr     readline

        movea.l #echo_text,a0
        bsr     puts

        movea.l #line_buffer,a0
        bsr     puts
        bsr     newline

        dc.w    MONITOR_TRAP

echo_text:
        dc.b    'ECHO: ',0
        even

line_buffer:
        dc.l    0,0,0,0,0,0,0,0

        include "work/programs/lib/console.inc"
        include "work/programs/lib/input.inc"
