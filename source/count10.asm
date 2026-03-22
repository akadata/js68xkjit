; count to ten and return to the monitor
moveq #0,d0
addq.w #1,d0
cmpi.w #10,d0
bne 00090002
monitor
