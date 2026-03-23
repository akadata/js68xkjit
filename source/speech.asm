; timer-driven retro speech-style audio demo
; channel 0 only, using pulse/saw/noise on the current audio MMIO map

movea.l #$00de1000,a1
move.w #$00ff,$0006(a1)
move.w #$0000,$0010(a1)
move.w #$2400,$0016(a1)
move.w #$0012,$001a(a1)
move.w #$0086,$001c(a1)
move.w #$00d0,$001e(a1)
move.w #$0001,$0002(a1)

movea.l #$00de0010,a2
moveq #0,d0
move.b d0,(a2)
move.b d0,$0001(a2)
moveq #2,d0
move.b d0,$0002(a2)
moveq #0,d0
move.b d0,$0003(a2)
moveq #0,d0
move.b d0,$0004(a2)
move.b d0,$0005(a2)
moveq #2,d0
move.b d0,$0006(a2)
moveq #0,d0
move.b d0,$0007(a2)
moveq #3,d0
move.b d0,$000b(a2)
moveq #1,d0
move.b d0,$000f(a2)

movea.l #frames,a0

frame_loop:
move.w (a0)+,d0
cmpi.w #$ffff,d0
beq done
move.w d0,$0018(a1)
move.w (a0)+,d0
move.w d0,$0012(a1)
move.w (a0)+,d0
move.w d0,$0014(a1)
move.w (a0)+,d0
move.w d0,$001e(a1)
move.w (a0)+,d7

wait_ticks:
movea.l #$00de001f,a3

wait_one:
move.b (a3),d0
andi.b #$01,d0
beq wait_one
moveq #1,d0
move.b d0,(a3)
dbra d7,wait_ticks
bra frame_loop

done:
move.w #$0000,$0018(a1)
movea.l #$00de001b,a2
moveq #0,d0
move.b d0,(a2)
monitor

frames:
dc.w $0403,$0000,$0000,$0050,$0001
dc.w $0303,$0100,$0000,$00b0,$0003
dc.w $0203,$00d0,$0000,$0098,$0003
dc.w $0303,$0140,$0000,$00c0,$0004
dc.w $0000,$0000,$0000,$0000,$0001
dc.w $0403,$0000,$0000,$0048,$0001
dc.w $0303,$00c0,$0000,$00a8,$0003
dc.w $0203,$00a0,$0000,$0090,$0003
dc.w $0303,$00e0,$0000,$00b8,$0004
dc.w $0000,$0000,$0000,$0000,$0002
dc.w $ffff
