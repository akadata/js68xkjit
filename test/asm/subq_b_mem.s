    .org 0x100
main:
    lea data,a0
    subq.b #3,(a0)
check:
    .dc.l 0xffffffff
    .dc.l 0xa0, data
    .dc.l 0xe0, data, 0x02
    .dc.l 0xf20, 0x001f, 0x0000
    .dc.l 0
    .org 0x180
data:
    .dc.b 0x05
