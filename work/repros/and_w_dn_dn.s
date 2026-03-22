        cpu 68000
        org $00090000

start:
        moveq   #$0f,d0
        moveq   #$ff,d1
        and.w   d0,d1
        trap    #0
