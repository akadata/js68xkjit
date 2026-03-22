        org $00090000

UART_DATA       equ $00DE0000
MONITOR_TRAP    equ $A000
STACK_SIZE      equ 128

start:
        bsr.w   scheduler_start
        dc.w    MONITOR_TRAP

task1:
        movea.l #UART_DATA,a1
        moveq   #4,d7

task1_loop:
        moveq   #65,d0
        bsr.w   putc
        bsr.w   yield
        dbra    d7,task1_loop
        bra.w   task_exit

task2:
        movea.l #UART_DATA,a1
        moveq   #4,d7

task2_loop:
        moveq   #66,d0
        bsr.w   putc
        bsr.w   yield
        dbra    d7,task2_loop
        bra.w   task_exit

current_tcb:
        dc.l    tcb2

tcb1:
        dc.l    task1_entry
        dc.l    1
        dc.l    0
        dc.l    0,0,0,0
        dc.l    0,0,0,0
        dc.l    0,0,0,0
        dc.l    0,0,0

tcb2:
        dc.l    task2_entry
        dc.l    1
        dc.l    0
        dc.l    0,0,0,0
        dc.l    0,0,0,0
        dc.l    0,0,0,0
        dc.l    0,0,0

task1_stack:
        ds.b    STACK_SIZE

task1_entry:
        dc.l    task1

task2_stack:
        ds.b    STACK_SIZE

task2_entry:
        dc.l    task2

        include "work/programs/lib/console.inc"
        include "work/programs/lib/task.inc"
