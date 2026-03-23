# Tasklist

Current source of truth: [TASKS.md](TASKS.md)

Immediate next block:

1. input niceties on the guest/launcher boundary
2. interrupt-driven input after cleaner IPL exposure
3. richer cooperative guest demos, still without preemption

Immediate next CPU block:

1. real `MOVEM`
2. real `NBCD`
3. real `ABCD`
4. memory rotates:
   - `ROL` memory
   - `ROR` memory
   - `ROXL` memory
   - `ROXR` memory

Constraints:

- `./runtests.sh` stays green
- `cd test && node runner.js` stays `231/233`
- `CALLM` and `RTM` stay explicitly deferred
