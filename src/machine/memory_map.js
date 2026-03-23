// Amiga-shaped laboratory map for the j68 test machine.
//
// This is only a layout scaffold. Matching an Amiga address range does not
// imply Amiga motherboard behavior, chipset semantics, CIA behavior, Gary
// behavior, Autoconfig, or Exec-visible meaning.
//
// The DE0000 window is reserved for this machine's own test devices even
// though the address lives in an Amiga-like region.
module.exports = {
    CHIP_RAM_START:     0x00000000,
    CHIP_RAM_END:       0x001fffff,
    CHIP_RAM_MAX_SIZE:  0x00200000,

    FAST_RAM_START:     0x00200000,
    FAST_RAM_END:       0x009fffff,
    FAST_RAM_MAX_SIZE:  0x00800000,

    // Reserved framebuffer region within CHIP RAM.
    // This is not separate memory; it is a conventional subrange used by VIDEO
    // unless software programs a different framebuffer base.
    VIDEO_RAM_START:    0x00100000,
    VIDEO_RAM_END:      0x0017ffff,
    VIDEO_RAM_SIZE:     0x00080000,

    CIA_START:          0x00bf0000,
    CIA_END:            0x00bfffff,

    RTC_START:          0x00dc0000,
    RTC_END:            0x00dcffff,

    // Test-machine MMIO reservation. Not a claim about real Amiga DE-space.
    MACHINE_IO_START:   0x00de0000,
    MACHINE_IO_END:     0x00deffff,

    UART_START:         0x00de0000,
    UART_END:           0x00de000f,
    UART_SIZE:          0x10,

    TIMER_START:        0x00de0010,
    TIMER_END:          0x00de001f,
    TIMER_SIZE:         0x10,

    INTC_START:         0x00de0020,
    INTC_END:           0x00de002f,
    INTC_SIZE:          0x10,

    DEBUGREGS_START:    0x00de0030,
    DEBUGREGS_END:      0x00de003f,
    DEBUGREGS_SIZE:     0x10,

    VIDEO_START:        0x00de0100,
    VIDEO_END:          0x00de01ff,
    VIDEO_SIZE:         0x100,

    BLITTER_START:      0x00de0200,
    BLITTER_END:        0x00de02ff,
    BLITTER_SIZE:       0x100,

    GFX_START:          0x00de0300,
    GFX_END:            0x00de03ff,
    GFX_SIZE:           0x100,

    COMPUTE_START:      0x00de0400,
    COMPUTE_END:        0x00de04ff,
    COMPUTE_SIZE:       0x100,

    DMA_START:          0x00de0500,
    DMA_END:            0x00de05ff,
    DMA_SIZE:           0x100,

    NET_START:          0x00de0600,
    NET_END:            0x00de06ff,
    NET_SIZE:           0x100,

    CRYPTO_START:       0x00de0700,
    CRYPTO_END:         0x00de07ff,
    CRYPTO_SIZE:        0x100,

    INPUT_START:        0x00de0800,
    INPUT_END:          0x00de08ff,
    INPUT_SIZE:         0x100,

    DISK_START:         0x00de0900,
    DISK_END:           0x00de09ff,
    DISK_SIZE:          0x100,

    IPC_START:          0x00de0a00,
    IPC_END:            0x00de0aff,
    IPC_SIZE:           0x100,



    AUDIO_START:        0x00de1000,
    AUDIO_END:          0x00de1fff,
    AUDIO_SIZE:         0x1000,






    ROM_START:          0x00f80000,
    ROM_END:            0x00ffffff,
    ROM_SIZE:           0x00080000,

    // Kickstart-style reset overlay. ROM is visible at address 0 after reset
    // until the machine explicitly disables the overlay.
    RESET_OVERLAY_START: 0x00000000
};
