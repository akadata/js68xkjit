; print HELLO WORLD ten times and return
moveq #9,d7
movea.l #$00de0000,a1

line_loop:
movea.l #message,a0

char_loop:
move.b (a0)+,d0
beq line_done
move.b d0,(a1)
bra char_loop

line_done:
moveq #13,d0
move.b d0,(a1)
moveq #10,d0
move.b d0,(a1)
dbra d7,line_loop
monitor

message:
dc.b 'HELLO WORLD',0
