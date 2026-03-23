# j68 Test Computer

Build: 
```../runtests.sh runner --rebuild-all
build asm/abcd.s
build asm/add_b.s
build asm/add_l.s
build asm/add_w.s
build asm/adda_l.s
build asm/adda_w.s
build asm/addi_b.s
build asm/addi_l.s
build asm/addi_w.s
build asm/addq_1.s
build asm/addq_b.s
build asm/addq_l.s
build asm/addq_w.s
build asm/addx_b.s
build asm/addx_l.s
build asm/addx_w.s
build asm/and_b_di.s
build asm/and_l_di.s
build asm/and_w_di.s
build asm/andi_b.s
build asm/andi_l.s
build asm/andi_to_ccr.s
build asm/andi_to_sr.s
build asm/andi_w.s
build asm/asl_d.s
build asm/asl_m.s
build asm/asr_d.s
build asm/asr_m.s
build asm/bcc_cc.s
build asm/bcc_cs.s
build asm/bcc_eq.s
build asm/bcc_ge.s
build asm/bcc_gt.s
build asm/bcc_hi.s
build asm/bcc_le.s
build asm/bcc_ls.s
build asm/bcc_lt.s
build asm/bcc_mi.s
build asm/bcc_ne.s
build asm/bcc_pl.s
build asm/bcc_vc.s
build asm/bcc_vs.s
build asm/bchg_d_d.s
build asm/bclr_d_d.s
build asm/bfchg.s
build asm/bfclr.s
build asm/bfexts.s
build asm/bfextu.s
build asm/bfffo.s
build asm/bfins.s
build asm/bfset.s
build asm/bftst.s
build asm/bkpt.s
build asm/bra_1.s
build asm/bra_2.s
build asm/bra_3.s
build asm/bra_l.s
build asm/bra_s.s
build asm/bset_d_d.s
build asm/bsr_l.s
build asm/bsr_s.s
build asm/btst_d_d.s
build asm/callm.s
build asm/cas2_l.s
build asm/cas_b.s
build asm/cas_l.s
build asm/cas_w.s
build asm/chk.s
build asm/chk2_l.s
build asm/chk2_w.s
build asm/cinv.s
build asm/clr_b.s
build asm/clr_l.s
build asm/clr_w.s
build asm/cmp2_l.s
build asm/cmp2_w.s
build asm/cmp_b.s
build asm/cmp_l.s
build asm/cmp_w.s
build asm/cmpa_l.s
build asm/cmpa_w.s
build asm/cmpi_b.s
build asm/cmpi_l.s
build asm/cmpi_w.s
build asm/cmpm_b.s
build asm/cmpm_l.s
build asm/cmpm_w.s
build asm/cpush.s
build asm/dbcc.s
build asm/dbra.s
build asm/divs.s
build asm/divu.s
build asm/eor_b_di.s
build asm/eor_l_di.s
build asm/eor_w_di.s
build asm/eori_b.s
build asm/eori_l.s
build asm/eori_to_ccr.s
build asm/eori_to_sr.s
build asm/eori_w.s
build asm/exg_aa.s
build asm/exg_da.s
build asm/exg_dd.s
build asm/ext_l.s
build asm/ext_w.s
build asm/extb.s
build asm/fline.s
build asm/illegal.s
build asm/jmp.s
build asm/jsr.s
build asm/lea.s
build asm/link.s
build asm/lsl_d.s
build asm/lsl_m.s
build asm/lsr_d.s
build asm/lsr_m.s
build asm/move16_mem_mem.s
build asm/move16_mem_reg.s
build asm/move_b_ai.s
build asm/move_b_di.s
build asm/move_b_pi.s
build asm/move_ccr_1.s
build asm/move_from_sr.s
build asm/move_from_usp.s
build asm/move_index_1.s
build asm/move_l_ai.s
build asm/move_l_di.s
build asm/move_l_pi.s
build asm/move_mem_1.s
build asm/move_reg_1.s
build asm/move_to_ccr.s
build asm/move_to_sr.s
build asm/move_to_usp.s
build asm/move_w_ai.s
build asm/move_w_di.s
build asm/movea_l.s
build asm/movea_w.s
build asm/movec_c_to_r.s
build asm/movec_privtrap.s
build asm/movec_r_to_c.s
build asm/movec_super.s
build asm/movem_l.s
build asm/movem_w.s
build asm/movep_l_d_mem.s
build asm/movep_l_mem_d.s
build asm/movep_w_d_mem.s
build asm/movep_w_mem_d.s
build asm/moveq_1.s
build asm/moveq_2.s
build asm/moveq_3.s
build asm/moveq_4.s
build asm/moveq_neg.s
build asm/moveq_pos.s
build asm/moves_b.s
build asm/moves_l.s
build asm/moves_privtrap.s
build asm/moves_super.s
build asm/moves_w.s
build asm/muls.s
build asm/mulu.s
build asm/nbcd.s
build asm/neg_b.s
build asm/neg_l.s
build asm/neg_w.s
build asm/negx_b.s
build asm/negx_l.s
build asm/negx_w.s
build asm/nop.s
build asm/not_b.s
build asm/not_l.s
build asm/not_w.s
build asm/or_b_di.s
build asm/or_l_di.s
build asm/or_w_di.s
build asm/ori_b.s
build asm/ori_l.s
build asm/ori_to_ccr.s
build asm/ori_to_sr.s
build asm/ori_w.s
build asm/pack.s
build asm/pea.s
build asm/pflush.s
build asm/pflusha.s
build asm/pload.s
build asm/pmove.s
build asm/ptest.s
build asm/reset.s
build asm/rol_d.s
build asm/ror_d.s
build asm/roxl_d.s
build asm/roxr_d.s
build asm/rtd.s
build asm/rtd_stack.s
build asm/rte.s
build asm/rte_frame.s
build asm/rte_privtrap.s
build asm/rtm.s
build asm/rtr.s
build asm/rtr_frame.s
build asm/rts.s
build asm/sbcd.s
build asm/scc.s
build asm/seq.s
build asm/sne.s
build asm/stop.s
build asm/stop_privtrap.s
build asm/stop_super.s
build asm/sub_b.s
build asm/sub_l.s
build asm/sub_w.s
build asm/suba_l.s
build asm/suba_w.s
build asm/subal_1.s
build asm/subi_b.s
build asm/subi_l.s
build asm/subi_w.s
build asm/subq_b.s
build asm/subq_l.s
build asm/subq_w.s
build asm/subx_b.s
build asm/subx_l.s
build asm/subx_w.s
build asm/swap.s
build asm/tas.s
build asm/trap.s
build asm/trap_a.s
build asm/trapcc.s
build asm/trapv.s
build asm/tst_b.s
build asm/tst_l.s
build asm/tst_w.s
build asm/unlk.s
build asm/unpk.s
wrote test.list
built=233 skipped=0
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
DEFER r/callm.r [deferred invalid smoke test]: CALLM requires a valid module descriptor and transfer target; this local smoke test points A0 at the program image
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
r/negx_l.r
r/negx_w.r
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
DEFER r/rtm.r [deferred invalid smoke test]: RTM requires a saved module state on the stack from a prior CALLM
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
Failed: 0/231
Deferred: 2/233

deferred invalid smoke test: 2

r/callm.r [deferred invalid smoke test]: CALLM requires a valid module descriptor and transfer target; this local smoke test points A0 at the program image
r/rtm.r [deferred invalid smoke test]: RTM requires a saved module state on the stack from a prior CALLM
```
