        org $00090000

UART_DATA       equ $00DE0000
MONITOR_TRAP    equ $A000

start:
        movea.l #UART_DATA,a1
        movea.l #message,a0

print_loop:
        move.b  (a0)+,d0
        beq.s   done
        move.b  d0,(a1)
        bra.s   print_loop

done:
        dc.w    MONITOR_TRAP

message:
        dc.b    'HELLO',13,10,0
        even
