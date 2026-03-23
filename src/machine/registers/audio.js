module.exports = {
    // -----------------------------------------------------------------
    // Global registers
    // -----------------------------------------------------------------
    GLOBAL_ID:          0x00,
    GLOBAL_CTRL:        0x02,
    GLOBAL_STATUS:      0x04,
    MASTER_VOL:         0x06,
    SAMPLE_RATE:        0x08,
    CHANNEL_COUNT:      0x0a,
    IRQ_ENABLE:         0x0c,
    IRQ_STATUS:         0x0e,

    // -----------------------------------------------------------------
    // Channel window selector
    // -----------------------------------------------------------------
    CH_INDEX:           0x10, // selected channel number

    // -----------------------------------------------------------------
    // Windowed per-channel registers
    // These apply to the channel selected in CH_INDEX
    // -----------------------------------------------------------------
    CH_FREQ_HI:         0x12,
    CH_FREQ_LO:         0x14,
    CH_PW:              0x16,
    CH_CTRL:            0x18,
    CH_AD:              0x1a,
    CH_SR:              0x1c,
    CH_VOL:             0x1e,
    CH_PAN:             0x20,
    CH_STATE:           0x22,
    CH_ENV_LEVEL:       0x24,
    CH_PHASE_HI:        0x26,
    CH_PHASE_LO:        0x28,
    CH_ADDR_HI:         0x2a,
    CH_ADDR_LO:         0x2c,
    CH_LEN_HI:          0x2e,
    CH_LEN_LO:          0x30,

    // Optional future registers
    CH_LOOP_START_HI:   0x32,
    CH_LOOP_START_LO:   0x34,
    CH_LOOP_LEN_HI:     0x36,
    CH_LOOP_LEN_LO:     0x38,

    // -----------------------------------------------------------------
    // Global control bits
    // -----------------------------------------------------------------
    GLOBAL_CTRL_BITS: {
        ENABLE:         0x0001,
        RESET:          0x0002,
        MUTE:           0x0004,
        IRQ_ENABLE:     0x0008,
    },

    GLOBAL_STATUS_BITS: {
        ENABLED:        0x0001,
        BUSY:           0x0002,
        IRQ_PENDING:    0x0004,
        CLIPPING:       0x0008,
    },

    CH_CTRL_BITS: {
        ENABLE:         0x0001,
        GATE:           0x0002,
        SYNC:           0x0004,
        RING:           0x0008,
        LOOP:           0x0010,
        IRQ_END:        0x0020,
    },

    CH_WAVE_SHIFT:      8,
    CH_WAVE_MASK:       0x0f00,

    CH_WAVE_TYPES: {
        NONE:           0x0,
        TRIANGLE:       0x1,
        SAW:            0x2,
        PULSE:          0x3,
        NOISE:          0x4,
        SINE:           0x5,
        PCM:            0x6,
        WAVETABLE:      0x7,
        USER0:          0x8,
    },

    CH_STATE_BITS: {
        ACTIVE:         0x0001,
        ATTACK:         0x0002,
        DECAY:          0x0004,
        SUSTAIN:        0x0008,
        RELEASE:        0x0010,
        ENDED:          0x0020,
        LOOPING:        0x0040,
        CLIPPED:        0x0080,
    },
};