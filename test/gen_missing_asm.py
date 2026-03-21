#!/usr/bin/env python3
# Generate assembly test files for missing 68000/68010/68020/68030/68040 instructions

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

# ============ 68000 Missing Instructions ============

# ADDI - Add Immediate
write_asm('addi_b', ['addi.b #0x55,d0', 'addi.b #0x55,(a0)'])
write_asm('addi_w', ['addi.w #0x5555,d0', 'addi.w #0x5555,(a0)'])
write_asm('addi_l', ['addi.l #0x55555555,d0', 'addi.l #0x55555555,(a0)'])

# ANDI - And Immediate  
write_asm('andi_b', ['andi.b #0x55,d0', 'andi.b #0x55,(a0)'])
write_asm('andi_w', ['andi.w #0x5555,d0', 'andi.w #0x5555,(a0)'])
write_asm('andi_l', ['andi.l #0x55555555,d0', 'andi.l #0x55555555,(a0)'])

# CMPM - Compare Memory
write_asm('cmpm_b', ['cmpm.b (a0)+,(a1)+'])
write_asm('cmpm_w', ['cmpm.w (a0)+,(a1)+'])
write_asm('cmpm_l', ['cmpm.l (a0)+,(a1)+'])

# EORI - Exclusive-Or Immediate
write_asm('eori_b', ['eori.b #0x55,d0', 'eori.b #0x55,(a0)'])
write_asm('eori_w', ['eori.w #0x5555,d0', 'eori.w #0x5555,(a0)'])
write_asm('eori_l', ['eori.l #0x55555555,d0', 'eori.l #0x55555555,(a0)'])

# ILLEGAL
write_asm('illegal', ['illegal'])

# MOVEP - Move Peripheral (to/from data register)
write_asm('movep_w_d_mem', ['movep.w d0,0(a0)'])
write_asm('movep_l_d_mem', ['movep.l d0,0(a0)'])
write_asm('movep_w_mem_d', ['movep.w 0(a0),d0'])
write_asm('movep_l_mem_d', ['movep.l 0(a0),d0'])

# ORI - Or Immediate
write_asm('ori_b', ['ori.b #0x55,d0', 'ori.b #0x55,(a0)'])
write_asm('ori_w', ['ori.w #0x5555,d0', 'ori.w #0x5555,(a0)'])
write_asm('ori_l', ['ori.l #0x55555555,d0', 'ori.l #0x55555555,(a0)'])

# RTE - Return from Exception (privileged)
write_asm('rte', ['rte'])

# SUBI - Subtract Immediate
write_asm('subi_b', ['subi.b #0x55,d0', 'subi.b #0x55,(a0)'])
write_asm('subi_w', ['subi.w #0x5555,d0', 'subi.w #0x5555,(a0)'])
write_asm('subi_l', ['subi.l #0x55555555,d0', 'subi.l #0x55555555,(a0)'])

# ============ 68010 Missing Instructions ============

# BKPT - Breakpoint
write_asm('bkpt', ['bkpt #0'])

# MOVEC - Move Control Register (privileged)
write_asm('movec_c_to_r', ['movec cacr,d0'])
write_asm('movec_r_to_c', ['movec d0,cacr'])

# MOVES - Move Address Space (privileged)
write_asm('moves_b', ['moves.b d0,(a0)'])
write_asm('moves_w', ['moves.w d0,(a0)'])
write_asm('moves_l', ['moves.l d0,(a0)'])

# RTD - Return and Deallocate
write_asm('rtd', ['rtd #4'])

# ============ 68020 Missing Instructions ============

# Bitfield instructions - simplified syntax
write_asm('bfchg', ['bfchg d0,(a0):4:8'])
write_asm('bfclr', ['bfclr d0,(a0):4:8'])
write_asm('bfexts', ['bfexts d0,(a0):4:8,d1'])
write_asm('bfextu', ['bfextu d0,(a0):4:8,d1'])
write_asm('bfffo', ['bfffo d0,(a0):4:8,d1'])
write_asm('bfins', ['bfins d0,(a0):4:8'])
write_asm('bfset', ['bfset d0,(a0):4:8'])
write_asm('bftst', ['bftst d0,(a0):4:8'])

# CALLM - Call Module
write_asm('callm', ['callm #0,(a0)'])

# CAS - Compare-and-Swap
write_asm('cas_b', ['cas.b d0,d1,(a0)'])
write_asm('cas_w', ['cas.w d0,d1,(a0)'])
write_asm('cas_l', ['cas.l d0,d1,(a0)'])

# CAS2 - Compare-and-Swap 2
write_asm('cas2_l', ['cas2.l d0:d1,d2:d3,(a0):(a1)'])

# CHK2 - Check Bounds
write_asm('chk2_w', ['chk2.w (a0),d0'])
write_asm('chk2_l', ['chk2.l (a0),d0'])

# CMP2 - Compare Bounds
write_asm('cmp2_w', ['cmp2.w (a0),d0'])
write_asm('cmp2_l', ['cmp2.l (a0),d0'])

# EXTB - Sign-Extend Byte to Long
write_asm('extb', ['extb.l d0'])

# PACK - Pack Data
write_asm('pack', ['pack d0,d1,#0x0000'])

# RTM - Return from Module
write_asm('rtm', ['rtm d0'])

# TRAPcc - Trap on Condition
write_asm('trapcc', ['trapcc #4'])

# UNPK - Unpack Data
write_asm('unpk', ['unpk d0,d1,#0x0000'])

# ============ 68030 Missing Instructions ============

# PFLUSH - Flush Cache/TLB
write_asm('pflush', ['pflush (a0)'])
write_asm('pflusha', ['pflusha'])

# PLOAD - Load TLB
write_asm('pload', ['pload (a0)'])

# PMOVE - Move TLB Entry
write_asm('pmove', ['pmove pbr,(a0)'])

# PTEST - Test TLB Translation
write_asm('ptest', ['ptest (a0)'])

# ============ 68040 Missing Instructions ============

# CINV - Invalidate Cache
write_asm('cinv', ['cinv ic'])

# CPUSH - Push Cache
write_asm('cpush', ['cpush ic'])

# MOVE16 - Block Move (16 bytes)
write_asm('move16_mem_mem', ['move16 (a0),(a1)'])
write_asm('move16_mem_reg', ['move16 (a0),d0'])

print(f"\nGenerated additional assembly files")
print(f"Total files in asm/: {len(os.listdir(ASM_DIR))}")
