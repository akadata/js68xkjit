# j68 Test Computer

A small virtual Motorola 68k test computer built around the `j68` CPU core created by `Takashi Toyoshima` [https://github.com/toyoshim/j68](https://github.com/toyoshim/j68)

This project is a bring-up machine, not a full Amiga implementation. The focus is:

- reset and vector behavior
- ROM/RAM/MMIO integration
- UART-backed machine-code monitor
- small guest programs loaded from the monitor
- deterministic system tests around exceptions, IRQs, and monitor workflows

Current project shape:

- `src/j68.js`
  - CPU core
- `src/machine/`
  - machine, bus, memory map, devices
- `src/monitor/`
  - monitor shell, tiny assembler/disassembler, commands
- `rom/`
  - monitor and test ROMs
- `source/`
  - monitor-loadable assembly source for `loadasm`
- `save/`
  - compiled binaries and saved monitor artifacts
- `work/programs/`
  - host-assembled standalone 68k programs and guest-side helper libraries
- `test/system/`
  - machine and monitor integration tests

Quick start:

```sh
./runtests.sh
cd test && node runner.js
node tools/monitor.js
```

Typical monitor flow:

```text
list
load 00090000 puthex.bin
g 00090000

source
loadasm 00090000 helloworld.asm
g 00090000
```

Environment:

- `J68_CPU_TYPE`
  - default: `68000`
- `J68_CHIP_RAM_SIZE`
  - default comes from `TestMachine`
- `J68_FAST_RAM_SIZE`
  - default comes from `TestMachine`
- `M68K_AS`
- `M68K_OBJCOPY`

Current stable baseline:

- `./runtests.sh` stays green
- `cd test && node runner.js` stays `231/233`
- `CALLM` and `RTM` remain explicitly deferred


Tests: 
```./runtests.sh full
----- Testing CPU 68000 -----
boot.test.js: ok
memory_map.test.js: ok
bus_device.test.js: ok
bus_transaction.test.js: ok
uart_boot.test.js: ok
monitor.test.js: ok
monitor_errors.test.js: ok
monitor_reset.test.js: ok
monitor_patch_loadsave.test.js: ok
monitor_loadasm.test.js: ok
monitor_saveasm.test.js: ok
monitor_assemble_roundtrip.test.js: ok
monitor_assemble_loop.test.js: ok
monitor_disasm.test.js: ok
monitor_exec.test.js: ok
monitor_cli.test.js: ok
monitor_line_editor.test.js: ok
monitor_program_output.test.js: ok
monitor_program_input.test.js: ok
monitor_timer.test.js: ok
irq.test.js: ok
----- Testing CPU 68020 -----
boot.test.js: ok
memory_map.test.js: ok
bus_device.test.js: ok
bus_transaction.test.js: ok
uart_boot.test.js: ok
monitor.test.js: ok
monitor_errors.test.js: ok
monitor_reset.test.js: ok
monitor_patch_loadsave.test.js: ok
monitor_loadasm.test.js: ok
monitor_saveasm.test.js: ok
monitor_assemble_roundtrip.test.js: ok
monitor_assemble_loop.test.js: ok
monitor_disasm.test.js: ok
monitor_exec.test.js: ok
monitor_cli.test.js: ok
monitor_line_editor.test.js: ok
monitor_program_output.test.js: ok
monitor_program_input.test.js: ok
monitor_timer.test.js: ok
irq.test.js: ok
----- Testing CPU 68030 -----
boot.test.js: ok
memory_map.test.js: ok
bus_device.test.js: ok
bus_transaction.test.js: ok
uart_boot.test.js: ok
monitor.test.js: ok
monitor_errors.test.js: ok
monitor_reset.test.js: ok
monitor_patch_loadsave.test.js: ok
monitor_loadasm.test.js: ok
monitor_saveasm.test.js: ok
monitor_assemble_roundtrip.test.js: ok
monitor_assemble_loop.test.js: ok
monitor_disasm.test.js: ok
monitor_exec.test.js: ok
monitor_cli.test.js: ok
monitor_line_editor.test.js: ok
monitor_program_output.test.js: ok
monitor_program_input.test.js: ok
monitor_timer.test.js: ok
irq.test.js: ok
----- Testing CPU 68040 -----
boot.test.js: ok
memory_map.test.js: ok
bus_device.test.js: ok
bus_transaction.test.js: ok
uart_boot.test.js: ok
monitor.test.js: ok
monitor_errors.test.js: ok
monitor_reset.test.js: ok
monitor_patch_loadsave.test.js: ok
monitor_loadasm.test.js: ok
monitor_saveasm.test.js: ok
monitor_assemble_roundtrip.test.js: ok
monitor_assemble_loop.test.js: ok
monitor_disasm.test.js: ok
monitor_exec.test.js: ok
monitor_cli.test.js: ok
monitor_line_editor.test.js: ok
monitor_program_output.test.js: ok
monitor_program_input.test.js: ok
monitor_timer.test.js: ok
irq.test.js: ok
----- Benchmark CPU 68000 -----
bench 1
BENCH1 REG-LOOP COUNT=50000 HOST_US=14661 VIRT_TICKS=10000
monitor_bench.test.js: ok
----- Benchmark CPU 68020 -----
bench 1
BENCH1 REG-LOOP COUNT=50000 HOST_US=20190 VIRT_TICKS=10000
monitor_bench.test.js: ok
----- Benchmark CPU 68030 -----
bench 1
BENCH1 REG-LOOP COUNT=50000 HOST_US=14152 VIRT_TICKS=10000
monitor_bench.test.js: ok
----- Benchmark CPU 68040 -----
bench 1
BENCH1 REG-LOOP COUNT=50000 HOST_US=19160 VIRT_TICKS=10000
monitor_bench.test.js: ok
r/abcd.r
r/add_b.r
r/add_l.r
r/add_w.r
r/adda_l.r
r/adda_w.r
r/addi_b.r
r/addi_l.r
r/addi_w.r
r/addq_1.r
r/addq_b.r
r/addq_l.r
r/addq_w.r
r/addx_b.r
r/addx_l.r
r/addx_w.r
r/and_b_di.r
r/and_l_di.r
r/and_w_di.r
r/andi_b.r
r/andi_l.r
r/andi_to_ccr.r
r/andi_to_sr.r
r/andi_w.r
r/asl_d.r
r/asl_m.r
r/asr_d.r
r/asr_m.r
r/bcc_cc.r
r/bcc_cs.r
r/bcc_eq.r
r/bcc_ge.r
r/bcc_gt.r
r/bcc_hi.r
r/bcc_le.r
r/bcc_ls.r
r/bcc_lt.r
r/bcc_mi.r
r/bcc_ne.r
r/bcc_pl.r
r/bcc_vc.r
r/bcc_vs.r
r/bchg_d_d.r
r/bclr_d_d.r
r/bfchg.r
r/bfclr.r
r/bfexts.r
r/bfextu.r
r/bfffo.r
r/bfins.r
r/bfset.r
r/bftst.r
r/bkpt.r
r/bra_1.r
r/bra_2.r
r/bra_3.r
r/bra_l.r
r/bra_s.r
r/bset_d_d.r
r/bsr_l.r
r/bsr_s.r
r/btst_d_d.r
r/callm.r
FAIL r/callm.r [invalid local smoke test]: CALLM requires a valid module descriptor and transfer target; this local smoke test points A0 at the program image
r/cas2_l.r
r/cas_b.r
r/cas_l.r
r/cas_w.r
r/chk.r
r/chk2_l.r
r/chk2_w.r
r/cinv.r
r/clr_b.r
r/clr_l.r
r/clr_w.r
r/cmp2_l.r
r/cmp2_w.r
r/cmp_b.r
r/cmp_l.r
r/cmp_w.r
r/cmpa_l.r
r/cmpa_w.r
r/cmpi_b.r
r/cmpi_l.r
r/cmpi_w.r
r/cmpm_b.r
r/cmpm_l.r
r/cmpm_w.r
r/cpush.r
r/dbcc.r
r/dbra.r
r/divs.r
r/divu.r
r/eor_b_di.r
r/eor_l_di.r
r/eor_w_di.r
r/eori_b.r
r/eori_l.r
r/eori_to_ccr.r
r/eori_to_sr.r
r/eori_w.r
r/exg_aa.r
r/exg_da.r
r/exg_dd.r
r/ext_l.r
r/ext_w.r
r/extb.r
r/fline.r
r/illegal.r
r/jmp.r
r/jsr.r
r/lea.r
r/link.r
r/lsl_d.r
r/lsl_m.r
r/lsr_d.r
r/lsr_m.r
r/move16_mem_mem.r
r/move16_mem_reg.r
r/move_b_ai.r
r/move_b_di.r
r/move_b_pi.r
r/move_ccr_1.r
r/move_from_sr.r
r/move_from_usp.r
r/move_index_1.r
r/move_l_ai.r
r/move_l_di.r
r/move_l_pi.r
r/move_mem_1.r
r/move_reg_1.r
r/move_to_ccr.r
r/move_to_sr.r
r/move_to_usp.r
r/move_w_ai.r
r/move_w_di.r
r/movea_l.r
r/movea_w.r
r/movec_c_to_r.r
r/movec_privtrap.r
r/movec_r_to_c.r
r/movec_super.r
r/movem_l.r
r/movem_w.r
r/movep_l_d_mem.r
r/movep_l_mem_d.r
r/movep_w_d_mem.r
r/movep_w_mem_d.r
r/moveq_1.r
r/moveq_2.r
r/moveq_3.r
r/moveq_4.r
r/moveq_neg.r
r/moveq_pos.r
r/moves_b.r
r/moves_l.r
r/moves_privtrap.r
r/moves_super.r
r/moves_w.r
r/muls.r
r/mulu.r
r/nbcd.r
r/neg_b.r
r/neg_l.r
r/neg_w.r
r/negx_b.r
j68: NEGX simplified
r/negx_l.r
j68: NEGX simplified
r/negx_w.r
j68: NEGX simplified
r/nop.r
r/not_b.r
r/not_l.r
r/not_w.r
r/or_b_di.r
r/or_l_di.r
r/or_w_di.r
r/ori_b.r
r/ori_l.r
r/ori_to_ccr.r
r/ori_to_sr.r
r/ori_w.r
r/pack.r
r/pea.r
r/pflush.r
r/pflusha.r
r/pload.r
r/pmove.r
r/ptest.r
r/reset.r
r/rol_d.r
r/ror_d.r
r/roxl_d.r
r/roxr_d.r
r/rtd.r
r/rtd_stack.r
r/rte.r
r/rte_frame.r
r/rte_privtrap.r
r/rtm.r
FAIL r/rtm.r [invalid local smoke test]: RTM requires a saved module state on the stack from a prior CALLM
r/rtr.r
r/rtr_frame.r
r/rts.r
r/sbcd.r
r/scc.r
r/seq.r
r/sne.r
r/stop.r
r/stop_privtrap.r
r/stop_super.r
r/sub_b.r
r/sub_l.r
r/sub_w.r
r/suba_l.r
r/suba_w.r
r/subal_1.r
r/subi_b.r
r/subi_l.r
r/subi_w.r
r/subq_b.r
r/subq_l.r
r/subq_w.r
r/subx_b.r
r/subx_l.r
r/subx_w.r
r/swap.r
r/tas.r
r/trap.r
r/trap_a.r
r/trapcc.r
r/trapv.r
r/tst_b.r
r/tst_l.r
r/tst_w.r
r/unlk.r
r/unpk.r

Passed: 231/233
Failed: 2/233

invalid local smoke test: 2

r/callm.r [invalid local smoke test]: CALLM requires a valid module descriptor and transfer target; this local smoketest points A0 at the program image
r/rtm.r [invalid local smoke test]: RTM requires a saved module state on the stack from a prior CALLM```
