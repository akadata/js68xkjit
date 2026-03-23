        org $00090000

MONITOR_TRAP     equ $A000
AUDIO_BASE       equ $00DE1000
TIMER_BASE       equ $00DE0010
ADDR_GLOBAL_CTRL equ $00DE1002
ADDR_MASTER_VOL  equ $00DE1006
ADDR_CH_INDEX    equ $00DE1010
ADDR_CH_FREQ_HI  equ $00DE1012
ADDR_CH_FREQ_LO  equ $00DE1014
ADDR_CH_CTRL     equ $00DE1018
ADDR_CH_AD       equ $00DE101A
ADDR_CH_SR       equ $00DE101C
ADDR_CH_VOL      equ $00DE101E
ADDR_TIMER_COUNT_HI equ $00DE0010
ADDR_TIMER_COUNT_LO equ $00DE0012
ADDR_TIMER_RELOAD_HI equ $00DE0014
ADDR_TIMER_RELOAD_LO equ $00DE0016
ADDR_TIMER_CTRL  equ $00DE001B
ADDR_TIMER_STATUS equ $00DE001F

CTRL_PULSE_ON    equ $0301
CTRL_PULSE_GATE  equ $0303
CTRL_SAW_ON      equ $0201
CTRL_SAW_GATE    equ $0203
TIMER_CTRL_ENABLE equ $01
TIMER_CTRL_AUTORELOAD equ $02
TIMER_STATUS_PENDING equ $01
STEP_RELOAD      equ $10A4

start:
        bsr.w   init_timer
        bsr.w   init_audio

        lea     melody_table,a2
        lea     bass_table,a3
        move.w  #127,d7

step_loop:
        moveq   #0,d6
        bsr.w   play_melody_step
        moveq   #1,d6
        bsr.w   play_bass_step
        bsr.w   wait_step
        dbra    d7,step_loop

        moveq   #0,d6
        bsr.w   select_channel
        move.w  #CTRL_PULSE_ON,d0
        bsr.w   write_ctrl_d0

        moveq   #1,d6
        bsr.w   select_channel
        move.w  #CTRL_SAW_ON,d0
        bsr.w   write_ctrl_d0

        move.w  #6,d1
release_steps:
        bsr.w   wait_step
        dbra    d1,release_steps
        dc.w    MONITOR_TRAP

init_timer:
        movea.l #ADDR_TIMER_COUNT_HI,a1
        moveq   #0,d0
        move.b  d0,(a1)
        movea.l #ADDR_TIMER_COUNT_HI+1,a1
        move.b  d0,(a1)
        movea.l #ADDR_TIMER_COUNT_LO,a1
        moveq   #$10,d0
        move.b  d0,(a1)
        movea.l #ADDR_TIMER_COUNT_LO+1,a1
        moveq   #-92,d0
        move.b  d0,(a1)

        movea.l #ADDR_TIMER_RELOAD_HI,a1
        moveq   #0,d0
        move.b  d0,(a1)
        movea.l #ADDR_TIMER_RELOAD_HI+1,a1
        move.b  d0,(a1)
        movea.l #ADDR_TIMER_RELOAD_LO,a1
        moveq   #$10,d0
        move.b  d0,(a1)
        movea.l #ADDR_TIMER_RELOAD_LO+1,a1
        moveq   #-92,d0
        move.b  d0,(a1)

        movea.l #ADDR_TIMER_STATUS,a1
        moveq   #TIMER_STATUS_PENDING,d0
        move.b  d0,(a1)

        movea.l #ADDR_TIMER_CTRL,a1
        moveq   #TIMER_CTRL_ENABLE|TIMER_CTRL_AUTORELOAD,d0
        move.b  d0,(a1)
        rts

init_audio:
        movea.l #ADDR_MASTER_VOL,a1
        moveq   #0,d0
        move.b  d0,(a1)
        movea.l #ADDR_MASTER_VOL+1,a1
        moveq   #-1,d0
        move.b  d0,(a1)

        moveq   #0,d6
        bsr.w   select_channel
        movea.l #ADDR_CH_AD,a1
        moveq   #0,d0
        move.b  d0,(a1)
        movea.l #ADDR_CH_AD+1,a1
        moveq   #36,d0
        move.b  d0,(a1)
        movea.l #ADDR_CH_SR,a1
        moveq   #0,d0
        move.b  d0,(a1)
        movea.l #ADDR_CH_SR+1,a1
        moveq   #-109,d0
        move.b  d0,(a1)
        movea.l #ADDR_CH_VOL,a1
        moveq   #0,d0
        move.b  d0,(a1)
        movea.l #ADDR_CH_VOL+1,a1
        moveq   #-48,d0
        move.b  d0,(a1)
        move.w  #CTRL_PULSE_ON,d0
        bsr.w   write_ctrl_d0

        moveq   #1,d6
        bsr.w   select_channel
        movea.l #ADDR_CH_AD,a1
        moveq   #0,d0
        move.b  d0,(a1)
        movea.l #ADDR_CH_AD+1,a1
        moveq   #19,d0
        move.b  d0,(a1)
        movea.l #ADDR_CH_SR,a1
        moveq   #0,d0
        move.b  d0,(a1)
        movea.l #ADDR_CH_SR+1,a1
        moveq   #117,d0
        move.b  d0,(a1)
        movea.l #ADDR_CH_VOL,a1
        moveq   #0,d0
        move.b  d0,(a1)
        movea.l #ADDR_CH_VOL+1,a1
        moveq   #-112,d0
        move.b  d0,(a1)
        move.w  #CTRL_SAW_ON,d0
        bsr.w   write_ctrl_d0

        movea.l #ADDR_GLOBAL_CTRL,a1
        moveq   #0,d0
        move.b  d0,(a1)
        movea.l #ADDR_GLOBAL_CTRL+1,a1
        moveq   #1,d0
        move.b  d0,(a1)
        rts

select_channel:
        movea.l #ADDR_CH_INDEX,a1
        moveq   #0,d5
        move.b  d5,(a1)
        movea.l #ADDR_CH_INDEX+1,a1
        move.b  d6,(a1)
        rts

write_freq_d0:
        move.l  d0,d4
        swap    d4
        move.w  d4,d5
        lsr.w   #8,d5
        movea.l #ADDR_CH_FREQ_HI,a1
        move.b  d5,(a1)
        movea.l #ADDR_CH_FREQ_HI+1,a1
        move.b  d4,(a1)
        move.w  d0,d5
        lsr.w   #8,d5
        movea.l #ADDR_CH_FREQ_LO,a1
        move.b  d5,(a1)
        movea.l #ADDR_CH_FREQ_LO+1,a1
        move.b  d0,(a1)
        rts

write_ctrl_d0:
        move.w  d0,d5
        lsr.w   #8,d5
        movea.l #ADDR_CH_CTRL,a1
        move.b  d5,(a1)
        movea.l #ADDR_CH_CTRL+1,a1
        move.b  d0,(a1)
        rts

play_melody_step:
        moveq   #0,d4
        moveq   #0,d5
        move.w  (a2)+,d4
        beq.s   melody_rest
        swap    d4
        move.w  (a2)+,d5
        or.l    d5,d4
        move.l  d4,d0
        move.w  #CTRL_PULSE_ON,d2
        move.w  #CTRL_PULSE_GATE,d3
        bra.s   play_note_step

melody_rest:
        addq.l  #2,a2
        move.w  #CTRL_PULSE_ON,d2
        bra.s   play_rest_step

play_bass_step:
        moveq   #0,d4
        moveq   #0,d5
        move.w  (a3)+,d4
        beq.s   bass_rest
        swap    d4
        move.w  (a3)+,d5
        or.l    d5,d4
        move.l  d4,d0
        move.w  #CTRL_SAW_ON,d2
        move.w  #CTRL_SAW_GATE,d3
        bra.s   play_note_step

bass_rest:
        addq.l  #2,a3
        move.w  #CTRL_SAW_ON,d2
        bra.s   play_rest_step

play_note_step:
        bsr.w   select_channel
        bsr.w   write_freq_d0
        move.w  d2,d0
        bsr.w   write_ctrl_d0
        move.w  d3,d0
        bsr.w   write_ctrl_d0
        rts

play_rest_step:
        bsr.w   select_channel
        move.w  d2,d0
        bsr.w   write_ctrl_d0
        rts

wait_step:
        movea.l #ADDR_TIMER_STATUS,a1
.wait_pending:
        move.b  (a1),d0
        andi.b  #TIMER_STATUS_PENDING,d0
        beq.s   .wait_pending
        moveq   #TIMER_STATUS_PENDING,d0
        move.b  d0,(a1)
        rts

melody_table:
        dc.l $0206fb93,$0206fb93,$0206fb93,$0206fb93,$02692af6,$02692af6,$02692af6,$00000000
        dc.l $0206fb93,$0206fb93,$0206fb93,$02b4bfec,$02b4bfec,$0206fb93,$0206fb93,$01ce5cf9
        dc.l $0206fb93,$0206fb93,$0206fb93,$0206fb93,$03099700,$03099700,$03099700,$00000000
        dc.l $0206fb93,$0206fb93,$0206fb93,$0337d629,$0337d629,$03099700,$03099700,$02692af6
        dc.l $0206fb93,$0206fb93,$03099700,$03099700,$040df725,$040df725,$0206fb93,$01ce5cf9
        dc.l $01ce5cf9,$01ce5cf9,$0184cd67,$0184cd67,$02692af6,$02692af6,$0206fb93,$0206fb93
        dc.l $0206fb93,$0206fb93,$00000000,$00000000,$00000000,$00000000,$00000000,$00000000
        dc.l $00000000,$00000000,$00000000,$00000000,$00000000,$00000000,$00000000,$00000000
        dc.l $0206fb93,$0206fb93,$0206fb93,$0206fb93,$02692af6,$02692af6,$02692af6,$00000000
        dc.l $0206fb93,$0206fb93,$0206fb93,$02b4bfec,$02b4bfec,$0206fb93,$0206fb93,$01ce5cf9
        dc.l $0206fb93,$0206fb93,$0206fb93,$0206fb93,$03099700,$03099700,$03099700,$00000000
        dc.l $0206fb93,$0206fb93,$0206fb93,$0337d629,$0337d629,$03099700,$03099700,$02692af6
        dc.l $0206fb93,$0206fb93,$03099700,$03099700,$040df725,$040df725,$0206fb93,$01ce5cf9
        dc.l $01ce5cf9,$0337d629,$0337d629,$03099700,$03099700,$02692af6,$02692af6,$0206fb93
        dc.l $0206fb93,$0206fb93,$0206fb93,$00000000,$00000000,$00000000,$00000000,$00000000
        dc.l $00000000,$00000000,$00000000,$00000000,$00000000,$00000000,$00000000,$00000000

bass_table:
        dc.l $0081bfd8,$0081bfd8,$00000000,$00000000,$0081bfd8,$00000000,$009a4ca4,$009a4ca4
        dc.l $0081bfd8,$0081bfd8,$00000000,$00000000,$00000000,$00000000,$00ad2ffb,$00ad2ffb
        dc.l $0081bfd8,$0081bfd8,$00000000,$00000000,$0081bfd8,$00000000,$009a4ca4,$009a4ca4
        dc.l $0081bfd8,$0081bfd8,$00000000,$00000000,$00000000,$00000000,$00ad2ffb,$00ad2ffb
        dc.l $0081bfd8,$0081bfd8,$00000000,$00000000,$0081bfd8,$00000000,$009a4ca4,$009a4ca4
        dc.l $0081bfd8,$0081bfd8,$00000000,$00000000,$00000000,$00000000,$00ad2ffb,$00ad2ffb
        dc.l $0081bfd8,$0081bfd8,$00000000,$00000000,$0081bfd8,$00000000,$009a4ca4,$009a4ca4
        dc.l $0081bfd8,$0081bfd8,$00000000,$00000000,$00000000,$00000000,$00ad2ffb,$00ad2ffb
        dc.l $0081bfd8,$0081bfd8,$00000000,$00000000,$0081bfd8,$00000000,$009a4ca4,$009a4ca4
        dc.l $0081bfd8,$0081bfd8,$00000000,$00000000,$00000000,$00000000,$00ad2ffb,$00ad2ffb
        dc.l $0081bfd8,$0081bfd8,$00000000,$00000000,$0081bfd8,$00000000,$009a4ca4,$009a4ca4
        dc.l $0081bfd8,$0081bfd8,$00000000,$00000000,$00000000,$00000000,$00ad2ffb,$00ad2ffb
        dc.l $0081bfd8,$0081bfd8,$00000000,$00000000,$0081bfd8,$00000000,$009a4ca4,$009a4ca4
        dc.l $0081bfd8,$0081bfd8,$00000000,$00000000,$00000000,$00000000,$00ad2ffb,$00ad2ffb
        dc.l $0081bfd8,$0081bfd8,$00000000,$00000000,$0081bfd8,$00000000,$009a4ca4,$009a4ca4
        dc.l $0081bfd8,$0081bfd8,$00000000,$00000000,$00000000,$00000000,$00ad2ffb,$00ad2ffb
