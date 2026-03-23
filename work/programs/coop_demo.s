        org $00000000

UART_DATA       equ $00DE0000
MONITOR_TRAP    equ $A000
STACK_SIZE      equ 128

start:
        lea     tcb1(pc),a0
        moveq   #18,d0
clear_tcb1:
        clr.l   (a0)+
        dbra    d0,clear_tcb1

        lea     tcb2(pc),a0
        moveq   #18,d0
clear_tcb2:
        clr.l   (a0)+
        dbra    d0,clear_tcb2

        lea     current_tcb(pc),a0
        lea     tcb2(pc),a1
        move.l  a1,(a0)

        lea     tcb1(pc),a0
        lea     task1_stack_end(pc),a1
        lea     task1(pc),a2
        move.l  a1,TCB_SP(a0)
        move.l  a2,TCB_ENTRY(a0)
        move.l  #1,TCB_ACTIVE(a0)
        clr.l   TCB_STARTED(a0)

        lea     tcb2(pc),a0
        lea     task2_stack_end(pc),a1
        lea     task2(pc),a2
        move.l  a1,TCB_SP(a0)
        move.l  a2,TCB_ENTRY(a0)
        move.l  #1,TCB_ACTIVE(a0)
        clr.l   TCB_STARTED(a0)

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
        dc.l    0

tcb1:
        ds.b    TCB_SIZE

tcb2:
        ds.b    TCB_SIZE

task1_stack:
        ds.b    STACK_SIZE
task1_stack_end:

task2_stack:
        ds.b    STACK_SIZE
task2_stack_end:

        include "work/programs/lib/console.inc"
        include "work/programs/lib/task.inc"
