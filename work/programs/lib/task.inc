; Minimal cooperative task helper ABI:
;   current_tcb points at the currently running task control block
;   each TCB contains saved SP, active/started flags, and explicit register slots
; This runtime is intentionally narrow and deterministic.

TCB_SP          equ 0
TCB_ACTIVE      equ 4
TCB_STARTED     equ 8
TCB_D0          equ 12
TCB_D1          equ 16
TCB_D2          equ 20
TCB_D3          equ 24
TCB_D4          equ 28
TCB_D5          equ 32
TCB_D6          equ 36
TCB_D7          equ 40
TCB_A0          equ 44
TCB_A1          equ 48
TCB_A2          equ 52
TCB_A3          equ 56
TCB_A4          equ 60
TCB_A5          equ 64
TCB_A6          equ 68
TCB_SIZE        equ 72

scheduler_start:
        bra.w   scheduler_select

yield:
        move.l  d0,-(a7)
        move.l  a0,-(a7)
        lea     current_tcb(pc),a0
        movea.l (a0),a0
        move.l  4(a7),TCB_D0(a0)
        move.l  d1,TCB_D1(a0)
        move.l  d2,TCB_D2(a0)
        move.l  d3,TCB_D3(a0)
        move.l  d4,TCB_D4(a0)
        move.l  d5,TCB_D5(a0)
        move.l  d6,TCB_D6(a0)
        move.l  d7,TCB_D7(a0)
        move.l  (a7),TCB_A0(a0)
        move.l  a1,TCB_A1(a0)
        move.l  a2,TCB_A2(a0)
        move.l  a3,TCB_A3(a0)
        move.l  a4,TCB_A4(a0)
        move.l  a5,TCB_A5(a0)
        move.l  a6,TCB_A6(a0)
        lea     8(a7),a1
        move.l  a1,TCB_SP(a0)
        bra.w   scheduler_select

task_exit:
        lea     current_tcb(pc),a0
        movea.l (a0),a0
        clr.l   TCB_ACTIVE(a0)
        bra.w   scheduler_select

scheduler_select:
        lea     current_tcb(pc),a0
        movea.l (a0),a0
        lea     tcb1(pc),a2
        cmpa.l  a2,a0
        beq.s   scheduler_try_tcb2

scheduler_try_tcb1:
        lea     tcb1(pc),a0
        tst.l   TCB_ACTIVE(a0)
        bne.s   scheduler_dispatch

scheduler_try_tcb2:
        lea     tcb2(pc),a0
        tst.l   TCB_ACTIVE(a0)
        bne.s   scheduler_dispatch
        lea     tcb1(pc),a0
        tst.l   TCB_ACTIVE(a0)
        bne.s   scheduler_dispatch
        bra.s   scheduler_done

scheduler_dispatch:
        lea     current_tcb(pc),a2
        move.l  a0,(a2)
        movea.l TCB_SP(a0),a7
        tst.l   TCB_STARTED(a0)
        bne.s   scheduler_resume
        move.l  #1,TCB_STARTED(a0)
        rts

scheduler_resume:
        movea.l a0,a2
        move.l  TCB_D0(a2),d0
        move.l  TCB_D1(a2),d1
        move.l  TCB_D2(a2),d2
        move.l  TCB_D3(a2),d3
        move.l  TCB_D4(a2),d4
        move.l  TCB_D5(a2),d5
        move.l  TCB_D6(a2),d6
        move.l  TCB_D7(a2),d7
        movea.l TCB_A0(a2),a0
        movea.l TCB_A1(a2),a1
        movea.l TCB_A3(a2),a3
        movea.l TCB_A4(a2),a4
        movea.l TCB_A5(a2),a5
        movea.l TCB_A6(a2),a6
        movea.l TCB_A2(a2),a2
        rts

scheduler_done:
        bsr.w   newline
        dc.w    MONITOR_TRAP
