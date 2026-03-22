        org $00090000

BUFFER          equ $00092000
MONITOR_TRAP    equ $A000

start:
        movea.l #BUFFER,a0
        moveq   #0,d1
        move.w  #255,d7

fill_loop:
        move.b  d1,(a0)+
        addq.w  #1,d1
        dbra    d7,fill_loop

        movea.l #BUFFER,a0
        moveq   #0,d0
        moveq   #0,d3
        move.w  #255,d7

check_loop:
        moveq   #0,d1
        move.b  (a0)+,d1
        cmp.b   d3,d1
        bne.s   fail
        add.l   d1,d0
        addq.w  #1,d3
        dbra    d7,check_loop

        dc.w    MONITOR_TRAP

fail:
        move.l  #$DEAD0001,d0
        dc.w    MONITOR_TRAP
