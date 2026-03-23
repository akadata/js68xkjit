        org $00090000

MONITOR_TRAP equ $A000
AUDIO_BASE   equ $00DE1000

start:
        moveq   #0,d0

        movea.l #AUDIO_BASE+$06,a1
        move.b  d0,(a1)
        movea.l #AUDIO_BASE+$07,a1
        moveq   #-1,d0
        move.b  d0,(a1)

        movea.l #AUDIO_BASE+$12,a1
        moveq   #5,d0
        move.b  d0,(a1)
        movea.l #AUDIO_BASE+$13,a1
        moveq   #27,d0
        move.b  d0,(a1)

        movea.l #AUDIO_BASE+$14,a1
        moveq   #-65,d0
        move.b  d0,(a1)
        movea.l #AUDIO_BASE+$15,a1
        moveq   #115,d0
        move.b  d0,(a1)

        movea.l #AUDIO_BASE+$1A,a1
        moveq   #0,d0
        move.b  d0,(a1)
        movea.l #AUDIO_BASE+$1B,a1
        moveq   #35,d0
        move.b  d0,(a1)

        movea.l #AUDIO_BASE+$1C,a1
        moveq   #0,d0
        move.b  d0,(a1)
        movea.l #AUDIO_BASE+$1D,a1
        moveq   #-92,d0
        move.b  d0,(a1)

        movea.l #AUDIO_BASE+$1E,a1
        moveq   #0,d0
        move.b  d0,(a1)
        movea.l #AUDIO_BASE+$1F,a1
        moveq   #-64,d0
        move.b  d0,(a1)

        movea.l #AUDIO_BASE+$02,a1
        moveq   #0,d0
        move.b  d0,(a1)
        movea.l #AUDIO_BASE+$03,a1
        moveq   #1,d0
        move.b  d0,(a1)

        movea.l #AUDIO_BASE+$18,a1
        moveq   #3,d0
        move.b  d0,(a1)
        movea.l #AUDIO_BASE+$19,a1
        move.b  d0,(a1)
        bsr.s   delay_on

        movea.l #AUDIO_BASE+$18,a1
        moveq   #3,d0
        move.b  d0,(a1)
        movea.l #AUDIO_BASE+$19,a1
        moveq   #1,d0
        move.b  d0,(a1)
        bsr.s   delay_off

        dc.w    MONITOR_TRAP

delay_on:
        move.w  #24,d1
.delay_on_outer:
        move.w  #$FFFF,d0
.delay_on_inner:
        dbra    d0,.delay_on_inner
        dbra    d1,.delay_on_outer
        rts

delay_off:
        move.w  #8,d1
.delay_off_outer:
        move.w  #$FFFF,d0
.delay_off_inner:
        dbra    d0,.delay_off_inner
        dbra    d1,.delay_off_outer
        rts
