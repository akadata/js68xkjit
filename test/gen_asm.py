#!/usr/bin/env python3
# Generate assembly test files for all 68000 instructions

import os

ASM_DIR = '/home/smalley/reference/j68k/test/asm'

def write_asm(name, instructions):
    """Write an assembly test file"""
    content = f"""main:
    nop
"""
    for inst in instructions:
        content += f"    {inst}\n"
    
    content += """check:
    .dc.l 0xffffffff
    .dc.l 0xd0, 0
    .dc.l 0
"""
    
    path = os.path.join(ASM_DIR, f"{name}.s")
    with open(path, 'w') as f:
        f.write(content)
    print(f"Created {name}.s")

# Line 0: Bit operations and immediate logic
write_asm('btst_d_d', ['btst #0,d0', 'btst d1,d0'])
write_asm('bchg_d_d', ['bchg #0,d0', 'bchg d1,d0'])
write_asm('bclr_d_d', ['bclr #0,d0', 'bclr d1,d0'])
write_asm('bset_d_d', ['bset #0,d0', 'bset d1,d0'])
write_asm('andi_to_ccr', ['andi #0xf,ccr'])
write_asm('andi_to_sr', ['ori #0x2000,sr', 'andi #0x1fff,sr'])
write_asm('ori_to_ccr', ['ori #0x1,ccr'])
write_asm('ori_to_sr', ['ori #0x2000,sr'])
write_asm('eori_to_ccr', ['eori #0x1,ccr'])
write_asm('eori_to_sr', ['ori #0x2000,sr', 'eori #0x2000,sr'])
write_asm('and_b_di', ['and.b #0x55,d0', 'and.b d0,d1'])
write_asm('and_w_di', ['and.w #0x5555,d0', 'and.w d0,d1'])
write_asm('and_l_di', ['and.l #0x55555555,d0', 'and.l d0,d1'])
write_asm('or_b_di', ['or.b #0xaa,d0', 'or.b d0,d1'])
write_asm('or_w_di', ['or.w #0xaaaa,d0', 'or.w d0,d1'])
write_asm('or_l_di', ['or.l #0xaaaaaaaa,d0', 'or.l d0,d1'])
write_asm('eor_b_di', ['eor.b d0,d1'])
write_asm('eor_w_di', ['eor.w d0,d1'])
write_asm('eor_l_di', ['eor.l d0,d1'])

# Line 1-3: MOVE variants
write_asm('move_b_di', ['move.b #0x55,d0', 'move.b d0,d1'])
write_asm('move_b_ai', ['move.b d0,(a0)', 'move.b (a0)+,d1', 'move.b -(a0),d1'])
write_asm('move_b_pi', ['move.b (a0)+,(a1)+'])
write_asm('move_w_di', ['move.w #0x5555,d0', 'move.w d0,d1'])
write_asm('move_w_ai', ['move.w d0,(a0)', 'move.w (a0)+,d1'])
write_asm('move_l_di', ['move.l #0x55555555,d0', 'move.l d0,d1'])
write_asm('move_l_ai', ['move.l d0,(a0)', 'move.l (a0)+,d1', 'move.l -(a0),d1'])
write_asm('move_l_pi', ['move.l (a0)+,(a1)+'])
write_asm('movea_l', ['movea.l #0x12345678,a0', 'movea.l d0,a1'])
write_asm('movea_w', ['movea.w #0x1234,a0', 'movea.w d0,a1'])

# Line 4: Miscellaneous
write_asm('clr_b', ['clr.b d0', 'clr.b (a0)'])
write_asm('clr_w', ['clr.w d0', 'clr.w (a0)'])
write_asm('clr_l', ['clr.l d0', 'clr.l (a0)'])
write_asm('not_b', ['not.b d0'])
write_asm('not_w', ['not.w d0'])
write_asm('not_l', ['not.l d0'])
write_asm('neg_b', ['neg.b d0'])
write_asm('neg_w', ['neg.w d0'])
write_asm('neg_l', ['neg.l d0'])
write_asm('negx_b', ['negx.b d0'])
write_asm('negx_w', ['negx.w d0'])
write_asm('negx_l', ['negx.l d0'])
write_asm('tst_b', ['tst.b d0'])
write_asm('tst_w', ['tst.w d0'])
write_asm('tst_l', ['tst.l d0'])
write_asm('tas', ['tas d0'])
write_asm('ext_w', ['moveq #0x80,d0', 'ext.w d0'])
write_asm('ext_l', ['moveq #0x80,d0', 'ext.w d0', 'ext.l d0'])
write_asm('swap', ['move.l #0x12345678,d0', 'swap d0'])
write_asm('nop', ['nop'])
write_asm('rts', ['bsr sub1', 'rts', 'sub1:', 'rts'])
write_asm('rtr', ['rtr'])
write_asm('jmp', ['jmp (a0)'])
write_asm('jsr', ['bsr sub2', 'rts', 'sub2:', 'rts'])
write_asm('lea', ['lea 8(a0),a1', 'lea (a0),a1'])
write_asm('pea', ['pea (a0)'])
write_asm('link', ['link a6,#-4', 'unlk a6'])
write_asm('unlk', ['link a6,#-8', 'unlk a6'])
write_asm('movem_l', ['movem.l d0-d1/a0-a1,-(sp)', 'movem.l (sp)+,d0-d1/a0-a1'])
write_asm('movem_w', ['movem.w d0-d1,-(sp)'])
write_asm('move_to_sr', ['move.w sr,d0', 'move.w d0,sr'])
write_asm('move_from_sr', ['move.w sr,d0'])
write_asm('move_to_ccr', ['move.w #0xf,ccr'])
write_asm('move_to_usp', ['move.l a7,a0', 'move.l a0,a7'])
write_asm('move_from_usp', ['move.l a0,usp'])
write_asm('trap', ['trap #5'])
write_asm('trapv', ['moveq #1,d0', 'addq.l #1,d0', 'trapv'])
write_asm('stop', ['ori #0x2000,sr', 'stop #0x2000'])
write_asm('reset', ['reset'])
write_asm('chk', ['moveq #5,d0', 'chk #10,d0'])
write_asm('nbcd', ['nbcd d0'])

# Line 5: ADDQ/SUBQ, DBcc, Scc
write_asm('addq_b', ['addq.b #1,d0', 'addq.b #8,d0'])
write_asm('addq_w', ['addq.w #1,d0', 'addq.w #8,d0'])
write_asm('addq_l', ['addq.l #1,d0', 'addq.l #8,d0'])
write_asm('subq_b', ['subq.b #1,d0', 'subq.b #8,d0'])
write_asm('subq_w', ['subq.w #1,d0', 'subq.w #8,d0'])
write_asm('subq_l', ['subq.l #1,d0', 'subq.l #8,d0'])
write_asm('scc', ['scc d0'])
write_asm('seq', ['seq d0'])
write_asm('sne', ['sne d0'])
write_asm('dbra', ['moveq #5,d0', 'dbra d0,lab1', 'lab1:'])
write_asm('dbcc', ['moveq #3,d0', 'dbcc d0,lab2', 'lab2:'])

# Line 6: Branches
write_asm('bra_s', ['bra lab1', 'lab1:'])
write_asm('bra_l', ['bra lab2', 'nop', 'nop', 'nop', 'nop', 'nop', 'nop', 'nop', 'nop', 'lab2:'])
write_asm('bsr_s', ['bsr sub3', 'rts', 'sub3:', 'rts'])
write_asm('bsr_l', ['bsr sub4', 'rts', 'nop', 'nop', 'nop', 'nop', 'nop', 'nop', 'nop', 'nop', 'sub4:', 'rts'])
write_asm('bcc_hi', ['bhi lab3', 'lab3:'])
write_asm('bcc_ls', ['bls lab4', 'lab4:'])
write_asm('bcc_cc', ['bcc lab5', 'lab5:'])
write_asm('bcc_cs', ['bcs lab6', 'lab6:'])
write_asm('bcc_ne', ['bne lab7', 'lab7:'])
write_asm('bcc_eq', ['beq lab8', 'beq lab8', 'lab8:'])
write_asm('bcc_vc', ['bvc lab9', 'lab9:'])
write_asm('bcc_vs', ['bvs lab10', 'lab10:'])
write_asm('bcc_pl', ['bpl lab11', 'lab11:'])
write_asm('bcc_mi', ['bmi lab12', 'lab12:'])
write_asm('bcc_ge', ['bge lab13', 'lab13:'])
write_asm('bcc_lt', ['blt lab14', 'lab14:'])
write_asm('bcc_gt', ['bgt lab15', 'lab15:'])
write_asm('bcc_le', ['ble lab16', 'lab16:'])

# Line 7: MOVEQ
write_asm('moveq_pos', ['moveq #0,d0', 'moveq #127,d0'])
write_asm('moveq_neg', ['moveq #-1,d0', 'moveq #-128,d0'])

# Line 8: DIVS/DIVU, OR
write_asm('divs', ['move.l #100,d0', 'moveq #10,d1', 'divs d1,d0'])
write_asm('divu', ['move.l #100,d0', 'moveq #10,d1', 'divu d1,d0'])
write_asm('sbcd', ['sbcd d1,d0'])

# Line 9: SUB/SUBA/SUBX
write_asm('sub_b', ['sub.b #1,d0', 'sub.b d0,d1'])
write_asm('sub_w', ['sub.w #1,d0', 'sub.w d0,d1'])
write_asm('sub_l', ['sub.l #1,d0', 'sub.l d0,d1'])
write_asm('suba_w', ['suba.w #1,a0', 'suba.w d0,a1'])
write_asm('suba_l', ['suba.l #1,a0', 'suba.l d0,a1'])
write_asm('subx_b', ['subx.b d1,d0'])
write_asm('subx_w', ['subx.w d1,d0'])
write_asm('subx_l', ['subx.l d1,d0'])

# Line A: Trap
write_asm('trap_a', ['trap #0'])

# Line B: CMP/CMPA/CMPI/EOR
write_asm('cmp_b', ['cmp.b #1,d0', 'cmp.b d0,d1'])
write_asm('cmp_w', ['cmp.w #1,d0', 'cmp.w d0,d1'])
write_asm('cmp_l', ['cmp.l #1,d0', 'cmp.l d0,d1'])
write_asm('cmpa_w', ['cmpa.w #1,a0', 'cmpa.w d0,a1'])
write_asm('cmpa_l', ['cmpa.l #1,a0', 'cmpa.l d0,a1'])
write_asm('cmpi_b', ['cmpi.b #1,d0'])
write_asm('cmpi_w', ['cmpi.w #1,d0'])
write_asm('cmpi_l', ['cmpi.l #1,d0'])

# Line C: MULS/MULU, ABCD, AND, EXG
write_asm('muls', ['moveq #10,d0', 'moveq #-5,d1', 'muls d1,d0'])
write_asm('mulu', ['moveq #10,d0', 'moveq #5,d1', 'mulu d1,d0'])
write_asm('abcd', ['abcd d1,d0'])
write_asm('exg_dd', ['exg d0,d1'])
write_asm('exg_aa', ['exg a0,a1'])
write_asm('exg_da', ['exg d0,a0'])

# Line D: ADD/ADDA/ADDX
write_asm('add_b', ['add.b #1,d0', 'add.b d0,d1'])
write_asm('add_w', ['add.w #1,d0', 'add.w d0,d1'])
write_asm('add_l', ['add.l #1,d0', 'add.l d0,d1'])
write_asm('adda_w', ['adda.w #1,a0', 'adda.w d0,a1'])
write_asm('adda_l', ['adda.l #1,a0', 'adda.l d0,a1'])
write_asm('addx_b', ['addx.b d1,d0'])
write_asm('addx_w', ['addx.w d1,d0'])
write_asm('addx_l', ['addx.l d1,d0'])

# Line E: Shift & Rotate
write_asm('asl_d', ['asl.b #1,d0', 'asl.w #1,d0', 'asl.l #1,d0'])
write_asm('asr_d', ['asr.b #1,d0', 'asr.w #1,d0', 'asr.l #1,d0'])
write_asm('lsl_d', ['lsl.b #1,d0', 'lsl.w #1,d0', 'lsl.l #1,d0'])
write_asm('lsr_d', ['lsr.b #1,d0', 'lsr.w #1,d0', 'lsr.l #1,d0'])
write_asm('rol_d', ['rol.b #1,d0', 'rol.w #1,d0', 'rol.l #1,d0'])
write_asm('ror_d', ['ror.b #1,d0', 'ror.w #1,d0', 'ror.l #1,d0'])
write_asm('roxl_d', ['roxl.b #1,d0', 'roxl.w #1,d0', 'roxl.l #1,d0'])
write_asm('roxr_d', ['roxr.b #1,d0', 'roxr.w #1,d0', 'roxr.l #1,d0'])
# Memory shift variants - removed (syntax issues with m68k-amigaos-as)
# Memory shifts require special syntax not supported by all assemblers

# Line F: F-line
write_asm('fline', ['.dc.w 0xf000'])

print(f"\nGenerated {len(os.listdir(ASM_DIR))} assembly files")
