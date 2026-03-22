# Standalone RAM Programs

These binaries target the current j68 lab machine and are meant to be loaded at
`00090000` through the ROM monitor.

Build:

```sh
work/programs/build.sh
```

Programs:

- `hello_uart.bin`
  - prints `HELLO` and returns to the monitor
  - uses the shared console helper layer
- `puthex.bin`
  - prints `1234ABCD`
  - demonstrates hex output
  - uses the shared console helper layer
- `ram_checksum.bin`
  - fills RAM at `00092000..000920FF`
  - verifies the pattern
  - leaves checksum in `D0`
  - expected success value: `00007F80`
- `pi16_nilakantha.bin`
  - computes pi in `16.16` fixed point using `16` Nilakantha terms
  - leaves result in `D0`
- `print_pi16.bin`
  - computes pi in `16.16`
  - prints `3.14154`
  - returns to the monitor
  - uses the shared console helper layer
- `print_status.bin`
  - prints labeled 32-bit hex values
  - demonstrates the higher-level `puts_hex32` helper
  - returns to the monitor

Shared helper layer:

- `work/programs/lib/console.inc`
  - `putc`
  - `puts`
  - `newline`
  - `puthex32`
  - `puts_hex32`

Role split:

- `Node.js`
  - host-side machine, bus, devices, monitor shell, file backing, and later web/UI
- `68k machine code`
  - guest-side monitor logic, formatting helpers, and standalone example programs

The guest code does not talk to the host directly. It talks to the virtual UART,
timer, and other virtual devices. Node owns the real-world bridge for terminal
I/O now, and later sound/video/web transport too.

Typical monitor flow:

```text
load 00090000 hello_uart.bin
g 00090000

load 00090000 puthex.bin
g 00090000

load 00090000 ram_checksum.bin
g 00090000
r

load 00090000 pi16_nilakantha.bin
g 00090000
r

load 00090000 print_pi16.bin
g 00090000

load 00090000 print_status.bin
g 00090000
```
