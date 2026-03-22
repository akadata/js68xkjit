# j68 Test Machine

This machine is a generic `j68` laboratory computer with an Amiga-shaped memory layout.

The address map is being used as a bring-up scaffold only.

What the current machine means:

- low memory behaves like chip-RAM placement
- expansion-space RAM behaves like fast-RAM placement
- ROM lives in a Kickstart-like top-of-24-bit window
- reset starts with a ROM overlay at address `0`
- `0x00de0000-0x00deffff` is reserved for this machine's own MMIO devices

What the current machine does not mean:

- no Amiga custom chip implementation
- no CIA behavior
- no Gary behavior
- no Autoconfig behavior
- no Exec assumptions
- no disk or filesystem environment

Current device policy:

- the `DE0000` window is a test-machine reservation
- device semantics are defined only by code in `src/machine/devices/`
- matching an Amiga address range does not imply real Amiga hardware behavior

Current implementation status:

- bus and mapped regions exist
- chip RAM, fast RAM, ROM, and reset overlay exist
- CPU type can be selected as `68000`, `68020`, `68030`, or `68040`
- MMIO windows are reserved but not yet implemented

Next work order:

1. UART device
2. ROM vectors and boot banner
3. monitor prompt
4. memory/register commands
5. step/run control
6. timer and IRQ controller
