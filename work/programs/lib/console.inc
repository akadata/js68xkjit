; Console helper ABI:
;   A1 = UART data register
;   A0 = string pointer for puts
;   D0 = character for putc / 32-bit value for puthex32 / puts_hex32
; Clobbers:
;   puts: D0
;   puthex32: D0-D7/A2
;   puts_hex32: D0-D7/A0-A2

putc:
        move.b  d0,(a1)
        rts

newline:
        moveq   #13,d0
        bsr.s   putc
        moveq   #10,d0
        bra.s   putc

puts:
puts_loop:
        move.b  (a0)+,d0
        beq.s   puts_done
        bsr.s   putc
        bra.s   puts_loop

puts_done:
        rts

puts_hex32:
        move.l  d0,-(a7)
        bsr.s   puts
        moveq   #61,d0
        bsr.s   putc
        move.l  (a7)+,d0
        bsr.s   puthex32
        bra.s   newline

puthex32:
        move.l  d0,d5
        swap    d5
        moveq   #0,d0
        move.w  d5,d0
        bsr.s   puthex16
        move.l  d5,d0
        swap    d0
        bsr.s   puthex16
        rts

puthex16:
        moveq   #0,d6
        move.w  d0,d6

        move.w  #$1000,d4
        bsr.s   puthex16_digit
        move.w  #$0100,d4
        bsr.s   puthex16_digit
        move.w  #$0010,d4
        bsr.s   puthex16_digit
        move.w  d6,d1
        bsr.s   putnibble
        rts

puthex16_digit:
        move.l  d6,d2
        divu    d4,d2
        moveq   #0,d1
        move.w  d2,d1
        bsr.s   putnibble
        swap    d2
        moveq   #0,d6
        move.w  d2,d6
        rts

putnibble:
        lea     hexdigits,a2

putnibble_loop:
        tst.w   d1
        beq.s   putnibble_emit
        move.b  (a2)+,d2
        subq.w  #1,d1
        bra.s   putnibble_loop

putnibble_emit:
        move.b  (a2),d2
        move.b  d2,(a1)
        rts

hexdigits:
        dc.b    '0123456789ABCDEF'
