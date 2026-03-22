        org $00090000

MONITOR_TRAP    equ $A000
FIX4            equ 262144          ; 4 << 16
FIX3            equ 196608          ; 3 << 16
PAIR_COUNT      equ 8               ; 16 terms total

start:
        move.l  #FIX3,d0            ; running pi in 16.16
        move.w  #2,d1               ; n
        move.w  #PAIR_COUNT-1,d7

pair_loop:
        bsr.s   term_n
        add.l   d3,d0
        addq.w  #2,d1

        bsr.s   term_n
        sub.l   d3,d0
        addq.w  #2,d1

        dbra    d7,pair_loop
        dc.w    MONITOR_TRAP

term_n:
        move.w  d1,d2               ; d2 = n
        move.w  d1,d3               ; d3 = n + 1
        addq.w  #1,d3
        mulu    d3,d2               ; d2 = n * (n + 1)
        move.w  d1,d3               ; d3 = n + 2
        addq.w  #2,d3
        mulu    d3,d2               ; d2 = n * (n + 1) * (n + 2)
        move.l  #FIX4,d3            ; dividend = 4 << 16
        divu    d2,d3               ; quotient in low word
        move.w  d3,d4
        clr.l   d3
        move.w  d4,d3
        rts
