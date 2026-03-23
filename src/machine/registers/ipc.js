// IPC register map for the j68 laboratory machine.
//
// This device provides a generic inter-process / inter-instance / host bridge
// communication block.
//
// Design goals:
// - small MMIO control surface
// - RAM-backed payloads
// - PEEK/POKE friendly
// - usable for:
//   - host <-> guest messaging
//   - guest instance <-> guest instance communication
//   - future service calls / remote commands / command queues
//
// This is not a bulk transport window.
// The actual message payload should live in RAM.
// IPC registers provide pointers, lengths, doorbells, status, and IRQ state.
//
// Absolute address = IPC_START + offset
//
// Suggested memory map:
//   IPC_START = 0x00de0a00
//   IPC_END   = 0x00de0aff
//
// This file defines register offsets and bit meanings only.

module.exports = {
    // -----------------------------------------------------------------
    // Global IPC registers
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

    // Global interrupt enable / mask.
    IRQ_ENABLE:         0x06,

    // Global interrupt status / acknowledge.
    IRQ_STATUS:         0x08,

    // Number of implemented IPC channels/endpoints.
    // Read-only.
    CHANNEL_COUNT:      0x0a,

    // Channel selector for the windowed per-channel register bank.
    // Software writes the channel number here, then uses the CH_* registers.
    CH_INDEX:           0x0c,

    // Last error or diagnostic code.
    // Read-only or implementation-defined.
    LAST_ERROR:         0x0e,

    // -----------------------------------------------------------------
    // Windowed per-channel registers
    // These apply to the channel selected in CH_INDEX.
    // -----------------------------------------------------------------

    // Per-channel control register.
    // See CH_CTRL_BITS below.
    CH_CTRL:            0x10,

    // Per-channel status register.
    // See CH_STATUS_BITS below.
    CH_STATUS:          0x12,

    // Transmit buffer address in RAM, 32-bit HI/LO.
    CH_TX_ADDR_HI:      0x14,
    CH_TX_ADDR_LO:      0x16,

    // Transmit payload length in bytes, 32-bit HI/LO.
    CH_TX_LEN_HI:       0x18,
    CH_TX_LEN_LO:       0x1a,

    // Receive buffer address in RAM, 32-bit HI/LO.
    CH_RX_ADDR_HI:      0x1c,
    CH_RX_ADDR_LO:      0x1e,

    // Receive payload length in bytes, 32-bit HI/LO.
    // For outbound setup this can define RX capacity.
    // For inbound delivery this reflects actual message length.
    CH_RX_LEN_HI:       0x20,
    CH_RX_LEN_LO:       0x22,

    // Small immediate command / message type / opcode field.
    // Useful for RPC-style or service-style communication.
    CH_OPCODE:          0x24,

    // Sequence / token / correlation ID.
    // Lets sender and receiver match replies or track messages.
    CH_TOKEN:           0x26,

    // Doorbell / notification register.
    // Writing here signals a send/post event.
    CH_DOORBELL:        0x28,

    // Acknowledge register.
    // Used to accept/clear receive or completion events.
    CH_ACK:             0x2a,

    // Optional shared descriptor address, 32-bit HI/LO.
    // Lets IPC graduate from one-message-at-a-time to a ring/queue model later.
    CH_DESC_ADDR_HI:    0x2c,
    CH_DESC_ADDR_LO:    0x2e,

    // -----------------------------------------------------------------
    // Global control bits
    // -----------------------------------------------------------------

    GLOBAL_CTRL_BITS: {
        ENABLE:         0x0001, // master IPC enable
        RESET:          0x0002, // reset IPC engine/channels
        LOOPBACK:       0x0004, // local loopback mode for testing
        IRQ_ENABLE:     0x0008, // global interrupt master enable
    },

    // -----------------------------------------------------------------
    // Global status bits
    // -----------------------------------------------------------------

    GLOBAL_STATUS_BITS: {
        ENABLED:        0x0001, // IPC engine enabled
        BUSY:           0x0002, // one or more channels active
        IRQ_PENDING:    0x0004, // one or more channel IRQs pending
        ERROR:          0x0008, // one or more channels faulted
    },

    // -----------------------------------------------------------------
    // Per-channel control bits
    // -----------------------------------------------------------------

    CH_CTRL_BITS: {
        ENABLE:         0x0001, // channel enabled
        TX_ENABLE:      0x0002, // allow transmit/post
        RX_ENABLE:      0x0004, // allow receive/delivery
        IRQ_TX_DONE:    0x0008, // interrupt on transmit completion
        IRQ_RX_READY:   0x0010, // interrupt on receive ready
        IRQ_ERROR:      0x0020, // interrupt on channel error
        USE_DESC:       0x0040, // use descriptor/ring pointer instead of single-shot buffers
        DMA_HINT:       0x0080, // channel expects DMA-assisted movement later
    },

    // -----------------------------------------------------------------
    // Per-channel status bits
    // -----------------------------------------------------------------

    CH_STATUS_BITS: {
        TX_BUSY:        0x0001, // transmit in progress
        TX_DONE:        0x0002, // transmit completed
        RX_READY:       0x0004, // receive payload ready
        ACK_PENDING:    0x0008, // waiting for software acknowledge
        ERROR:          0x0010, // channel faulted
        IRQ_PENDING:    0x0020, // per-channel interrupt pending
        PEER_ONLINE:    0x0040, // peer endpoint available
    },
};