; print HELLO and return to the monitor
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
moveq #13,d0
move.b d0,(a1)
moveq #10,d0
move.b d0,(a1)
monitor
