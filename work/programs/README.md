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
- `ram_checksum.bin`
  - fills RAM at `00092000..000920FF`
  - verifies the pattern
  - leaves checksum in `D0`
  - expected success value: `00007F80`
- `pi16_nilakantha.bin`
  - computes pi in `16.16` fixed point using `16` Nilakantha terms
  - leaves result in `D0`

Typical monitor flow:

```text
load 00090000 hello_uart.bin
g 00090000

load 00090000 ram_checksum.bin
g 00090000
r

load 00090000 pi16_nilakantha.bin
g 00090000
r
```
