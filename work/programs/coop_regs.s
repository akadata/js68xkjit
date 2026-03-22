        org $00000000

UART_DATA       equ $00DE0000
MONITOR_TRAP    equ $A000
STACK_SIZE      equ 128

start:
        lea     current_tcb(pc),a0
        lea     tcb2(pc),a1
        move.l  a1,(a0)

        lea     tcb1(pc),a0
        lea     task1_entry(pc),a1
        lea     task1(pc),a2
        move.l  a2,(a1)
        move.l  a1,TCB_SP(a0)
        move.l  #1,TCB_ACTIVE(a0)
        clr.l   TCB_STARTED(a0)

        lea     tcb2(pc),a0
        lea     task2_entry(pc),a1
        lea     task2(pc),a2
        move.l  a2,(a1)
        move.l  a1,TCB_SP(a0)
        move.l  #1,TCB_ACTIVE(a0)
        clr.l   TCB_STARTED(a0)

        bsr.w   scheduler_start
        dc.w    MONITOR_TRAP

task1:
        movea.l #UART_DATA,a1
        lea     text1(pc),a0
        moveq   #2,d7

task1_loop:
        move.b  (a0)+,d0
        bsr.w   putc
        bsr.w   yield
        dbra    d7,task1_loop
        bra.w   task_exit

task2:
        movea.l #UART_DATA,a1
        lea     text2(pc),a0
        moveq   #2,d7

task2_loop:
        move.b  (a0)+,d0
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

task1_entry:
        dc.l    task1

task2_stack:
        ds.b    STACK_SIZE

task2_entry:
        dc.l    task2

text1:
        dc.b    'ACE',0

text2:
        dc.b    'BDF',0

        include "work/programs/lib/console.inc"
        include "work/programs/lib/task.inc"
