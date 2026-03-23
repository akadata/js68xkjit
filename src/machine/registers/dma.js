// DMA register map for the j68 laboratory machine.
//
// This is a generic DMA engine intended to serve multiple devices:
//
// - audio sample transfer
// - disk block transfer
// - network packet transfer
// - future video/blitter support
//
// Design goals:
// - small MMIO control window
// - RAM-backed bulk transfer
// - reusable channel model
// - PEEK/POKE friendly
//
// Absolute address = DMA_START + offset
//
// Suggested memory map:
//   DMA_START = 0x00de0500
//   DMA_END   = 0x00de05ff
//
// This file defines register offsets and bit meanings only.

module.exports = {
    // -----------------------------------------------------------------
    // Global DMA registers
    // -----------------------------------------------------------------

    // Device identification / version.
    // Read-only.
    GLOBAL_ID:          0x00,

    // Global control register.
    // See GLOBAL_CTRL_BITS below.
    GLOBAL_CTRL:        0x02,

    // Global status register.
    // See GLOBAL_STATUS_BITS below.
    GLOBAL_STATUS:      0x04,

    // Interrupt enable / mask.
    IRQ_ENABLE:         0x06,

    // Interrupt status / acknowledge.
    IRQ_STATUS:         0x08,

    // Number of implemented DMA channels.
    // Read-only.
    CHANNEL_COUNT:      0x0a,

    // Channel selector for the windowed per-channel register bank.
    // Software writes the DMA channel number here, then accesses the
    // CH_* registers below.
    CH_INDEX:           0x0c,

    // Optional global debug / last error code.
    LAST_ERROR:         0x0e,

    // -----------------------------------------------------------------
    // Windowed per-channel registers
    // These apply to the channel selected in CH_INDEX.
    // -----------------------------------------------------------------

    // Channel control register.
    // See CH_CTRL_BITS below.
    CH_CTRL:            0x10,

    // Channel status register.
    // See CH_STATUS_BITS below.
    CH_STATUS:          0x12,

    // Source address, 32-bit as HI/LO words.
    CH_SRC_ADDR_HI:     0x14,
    CH_SRC_ADDR_LO:     0x16,

    // Destination address, 32-bit as HI/LO words.
    CH_DST_ADDR_HI:     0x18,
    CH_DST_ADDR_LO:     0x1a,

    // Transfer length in bytes, 32-bit as HI/LO words.
    CH_LEN_HI:          0x1c,
    CH_LEN_LO:          0x1e,

    // Optional source stride.
    // Useful later for 2D/video style copies.
    CH_SRC_STRIDE:      0x20,

    // Optional destination stride.
    CH_DST_STRIDE:      0x22,

    // Mode register.
    // See CH_MODE_BITS below.
    CH_MODE:            0x24,

    // Current position / progress, read-only, 32-bit HI/LO.
    CH_POS_HI:          0x26,
    CH_POS_LO:          0x28,

    // Descriptor pointer, optional future expansion.
    // Allows moving from simple register-driven DMA to RAM-backed
    // descriptor lists later without redesigning the block.
    CH_DESC_ADDR_HI:    0x2a,
    CH_DESC_ADDR_LO:    0x2c,

    // Reserved / future use.
    RESERVED0:          0x2e,

    // -----------------------------------------------------------------
    // Global control bits
    // -----------------------------------------------------------------

    GLOBAL_CTRL_BITS: {
        ENABLE:         0x0001, // master DMA enable
        RESET:          0x0002, // reset engine + channels
        IRQ_ENABLE:     0x0004, // global interrupt master enable
        HALT:           0x0008, // halt all active channels
    },

    // -----------------------------------------------------------------
    // Global status bits
    // -----------------------------------------------------------------

    GLOBAL_STATUS_BITS: {
        ENABLED:        0x0001, // engine enabled
        BUSY:           0x0002, // one or more channels active
        IRQ_PENDING:    0x0004, // one or more IRQs pending
        ERROR:          0x0008, // one or more channels faulted
    },

    // -----------------------------------------------------------------
    // Per-channel control bits
    // -----------------------------------------------------------------

    CH_CTRL_BITS: {
        ENABLE:         0x0001, // channel enabled
        START:          0x0002, // begin programmed transfer
        STOP:           0x0004, // stop/abort transfer
        PAUSE:          0x0008, // pause transfer
        IRQ_DONE:       0x0010, // interrupt on completion
        IRQ_ERROR:      0x0020, // interrupt on error
        USE_DESC:       0x0040, // use descriptor pointer instead of direct regs
    },

    // -----------------------------------------------------------------
    // Per-channel status bits
    // -----------------------------------------------------------------

    CH_STATUS_BITS: {
        ACTIVE:         0x0001, // transfer in progress
        DONE:           0x0002, // transfer completed
        PAUSED:         0x0004, // transfer paused
        ERROR:          0x0008, // transfer faulted
        IRQ_PENDING:    0x0010, // channel IRQ pending
    },

    // -----------------------------------------------------------------
    // Per-channel mode bits
    // -----------------------------------------------------------------
    //
    // Start simple:
    // - byte/word/long granularity
    // - optional increment control
    // - future 2D / ring / descriptor expansion possible

    CH_MODE_BITS: {
        SIZE_BYTE:      0x0000,
        SIZE_WORD:      0x0001,
        SIZE_LONG:      0x0002,
        SIZE_MASK:      0x0003,

        SRC_INC:        0x0010, // increment source after each unit
        DST_INC:        0x0020, // increment destination after each unit

        SRC_FIXED:      0x0040, // source remains constant
        DST_FIXED:      0x0080, // destination remains constant

        MODE_2D:        0x0100, // use stride registers for line stepping
        MODE_RING:      0x0200, // future circular buffer mode
    },
};