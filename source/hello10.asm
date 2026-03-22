; proof of life for the monitor assembler subset
; prints HELLO WORLD ten times, each followed by CR/LF, then returns
; note: this is monitor-source, so it uses no labels or data directives
moveq #10,d7
movea.l #$00de0000,a1
moveq #72,d0
move.b d0,(a1)
moveq #69,d0
move.b d0,(a1)
moveq #76,d0
move.b d0,(a1)
moveq #76,d0
move.b d0,(a1)
moveq #79,d0
move.b d0,(a1)
moveq #32,d0
move.b d0,(a1)
moveq #87,d0
move.b d0,(a1)
moveq #79,d0
move.b d0,(a1)
moveq #82,d0
move.b d0,(a1)
moveq #76,d0
move.b d0,(a1)
moveq #68,d0
move.b d0,(a1)
moveq #13,d0
move.b d0,(a1)
moveq #10,d0
move.b d0,(a1)
subq.w #1,d7
bne 00090008
monitor
