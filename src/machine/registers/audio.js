module.exports = {
    // -----------------------------------------------------------------
    // Global registers
    // -----------------------------------------------------------------

    // Device identification / version register.
    // Read-only. Useful for monitor inspection and future compatibility.
    GLOBAL_ID:          0x00,

    // Global control register.
    // See GLOBAL_CTRL_BITS below.
    GLOBAL_CTRL:        0x02,

    // Global status register.
    // See GLOBAL_STATUS_BITS below.
    GLOBAL_STATUS:      0x04,

    // Master output volume.
    // Suggested initial range: 0x0000..0x00ff.
    MASTER_VOL:         0x06,

    // Output sample rate hint or divider.
    // Implementation-defined. May be treated as a real sample rate later.
    SAMPLE_RATE:        0x08,

    // Number of implemented audio channels.
    // Read-only. Lets software discover 8/16/32/64 channel variants.
    CHANNEL_COUNT:      0x0a,

    // Global interrupt enable / mask.
    IRQ_ENABLE:         0x0c,

    // Global interrupt status / acknowledge.
    IRQ_STATUS:         0x0e,

    // -----------------------------------------------------------------
    // Channel window selector
    // -----------------------------------------------------------------

    // Selected channel number for windowed per-channel access.
    // Software writes the channel index here, then accesses CH_* below.
    CH_INDEX:           0x10,

    // -----------------------------------------------------------------
    // Windowed per-channel registers
    // These apply to the channel selected in CH_INDEX.
    // -----------------------------------------------------------------

    // 32-bit phase increment / frequency value, exposed as HI/LO words.
    // This is better than a simple 16-bit SID-style frequency because it
    // allows more precise tuning at modern sample rates.
    CH_FREQ_HI:         0x12,
    CH_FREQ_LO:         0x14,

    // Pulse width register for pulse / square waveform modes.
    // Ignored for non-pulse waveforms.
    CH_PW:              0x16,

    // Channel control register.
    // See CH_CTRL_BITS and waveform field below.
    CH_CTRL:            0x18,

    // Attack / Decay packed register.
    // High nibble = attack, low nibble = decay.
    CH_AD:              0x1a,

    // Sustain / Release packed register.
    // High nibble = sustain, low nibble = release.
    CH_SR:              0x1c,

    // Per-channel output volume.
    // Suggested initial range: 0x0000..0x00ff.
    CH_VOL:             0x1e,

    // Stereo pan.
    // Suggested range:
    //   0x0000 = hard left
    //   0x0080 = centre
    //   0x00ff = hard right
    CH_PAN:             0x20,

    // Current channel state, read-only.
    // See CH_STATE_BITS below.
    CH_STATE:           0x22,

    // Current envelope level, read-only.
    // Useful for debugging, monitor inspection, and visualisation.
    CH_ENV_LEVEL:       0x24,

    // Current oscillator phase / accumulator readback, read-only.
    // Useful for sync tricks and debugging.
    CH_PHASE_HI:        0x26,
    CH_PHASE_LO:        0x28,

    // Optional RAM-backed sample / wavetable pointer.
    // Used only for PCM / wavetable modes.
    CH_ADDR_HI:         0x2a,
    CH_ADDR_LO:         0x2c,

    // Optional RAM-backed sample / wavetable length.
    CH_LEN_HI:          0x2e,
    CH_LEN_LO:          0x30,

    // Optional future registers for looped PCM / wavetable playback.
    CH_LOOP_START_HI:   0x32,
    CH_LOOP_START_LO:   0x34,
    CH_LOOP_LEN_HI:     0x36,
    CH_LOOP_LEN_LO:     0x38,

    // -----------------------------------------------------------------
    // Global control bits
    // -----------------------------------------------------------------
    GLOBAL_CTRL_BITS: {
        ENABLE:         0x0001, // master audio enable
        RESET:          0x0002, // reset audio engine and channels
        MUTE:           0x0004, // hard mute output without clearing state
        IRQ_ENABLE:     0x0008, // global interrupt master enable
    },

    // -----------------------------------------------------------------
    // Global status bits
    // -----------------------------------------------------------------
    GLOBAL_STATUS_BITS: {
        ENABLED:        0x0001, // device enabled
        BUSY:           0x0002, // one or more channels currently active
        IRQ_PENDING:    0x0004, // one or more interrupt sources pending
        CLIPPING:       0x0008, // output clipping detected
    },

    // -----------------------------------------------------------------
    // Per-channel control bits
    // -----------------------------------------------------------------
    CH_CTRL_BITS: {
        ENABLE:         0x0001, // channel enabled
        GATE:           0x0002, // note gate on/off, drives ADSR state
        SYNC:           0x0004, // oscillator sync (future)
        RING:           0x0008, // ring modulation (future)
        LOOP:           0x0010, // loop sample / wavetable playback
        IRQ_END:        0x0020, // interrupt on note or sample end
    },

    // Waveform selection field lives in CH_CTRL.
    CH_WAVE_SHIFT:      8,
    CH_WAVE_MASK:       0x0f00,

    // -----------------------------------------------------------------
    // Waveform type values
    // -----------------------------------------------------------------
    // Keep the classic synth waveforms first.
    // Sine is a sensible modern addition.
    // PCM and wavetable modes allow later growth without redesign.
    CH_WAVE_TYPES: {
        NONE:           0x0,
        TRIANGLE:       0x1,
        SAW:            0x2,
        PULSE:          0x3,
        NOISE:          0x4,
        SINE:           0x5,
        PCM:            0x6,
        WAVETABLE:      0x7,
        USER0:          0x8, // reserved for future custom mode
    },

    // -----------------------------------------------------------------
    // Per-channel state bits (read-only)
    // -----------------------------------------------------------------
    CH_STATE_BITS: {
        ACTIVE:         0x0001, // channel currently audible / active
        ATTACK:         0x0002,
        DECAY:          0x0004,
        SUSTAIN:        0x0008,
        RELEASE:        0x0010,
        ENDED:          0x0020, // note or sample has ended
        LOOPING:        0x0040, // loop mode currently active
        CLIPPED:        0x0080, // per-channel clipping detected
    },
};
