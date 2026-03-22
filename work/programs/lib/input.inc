; Input helper ABI:
;   A1 = UART data register
;   A2 = UART status register
;   A0 = line buffer pointer for readline
;   D7 = max character count for readline
; Returns:
;   getc: D0 = received byte
;   readline: buffer at A0 is NUL-terminated
; Clobbers:
;   getc: D0-D1
;   readline: D0-D1/D7

UART_STATUS_RX_READY equ $02

getc:
getc_wait:
        moveq   #0,d0
        move.b  (a2),d0
        andi.w  #UART_STATUS_RX_READY,d0
        beq.s   getc_wait
        moveq   #0,d0
        move.b  (a1),d0
        rts

put_prompt:
        movea.l #prompt_text,a0
        bra     puts

readline:
readline_loop:
        bsr.s   getc
        cmpi.b  #13,d0
        beq.s   readline_done
        cmpi.b  #10,d0
        beq.s   readline_done
        move.b  d0,(a0)+
        bsr     putc
        subq.w  #1,d7
        bpl.s   readline_loop

readline_done:
        clr.b   (a0)
        bsr     newline
        rts

prompt_text:
        dc.b    'INPUT> ',0
        even
