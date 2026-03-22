# Tasklist

Current source of truth: [TASKS.md](TASKS.md)

Immediate next block:

1. guest-side input helpers, polling first
2. one interactive demo binary: `echo_line.bin`
3. review before any cooperative multitasking work

Constraints:

- `./runtests.sh` stays green
- `cd test && node runner.js` stays `231/233`
- `CALLM` and `RTM` stay explicitly deferred
