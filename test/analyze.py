#!/usr/bin/env python3
import json
import gzip
import os

# Load the 68000 instruction map
with open('/home/smalley/reference/ProcessorTests/680x0/map/68000.official.json') as f:
    map68000 = json.load(f)

# Classify instructions by opcode line and type
instructions_by_line = {}
for opcode_hex, asm in map68000.items():
    if asm == 'None':
        continue
    opcode = int(opcode_hex, 16)
    line = (opcode >> 12) & 0xF
    
    # Parse mnemonic
    parts = asm.split('.')
    mnemonic = parts[0].split()[0]
    size = parts[1] if len(parts) > 1 and parts[1][0] in 'bwl' else None
    
    if line not in instructions_by_line:
        instructions_by_line[line] = {}
    if mnemonic not in instructions_by_line[line]:
        instructions_by_line[line][mnemonic] = []
    instructions_by_line[line][mnemonic].append(opcode_hex)

# Print summary
print("=== 68000 Instructions by Opcode Line ===")
for line in sorted(instructions_by_line.keys()):
    print(f"Line {line:X}: {', '.join(sorted(instructions_by_line[line].keys()))}")

# CPU Generation Classification
print("\n=== CPU Generation Classification ===")

# 68000 base - all instructions in the map
print("\n68000 (base): All 73 instructions above")

# 68010 additions
print("\n68010 additions:")
print("  - MOVE from SR (privileged -> unprivileged)")
print("  - MOVE to CCR (new instruction)")
print("  - MOVE from USP (new)")
print("  - MOVE to USP (new)")

# 68020 additions  
print("\n68020 additions:")
print("  - Bitfield instructions (BFxxx)")
print("  - 32-bit displacements")
print("  - New addressing modes")
print("  - CALLM/RTM (removed in 68040)")

# 68030 additions
print("\n68030 additions:")
print("  - MMU/TLB instructions (PFLUSH, etc.)")
print("  - Cache control (CPUSH, etc.)")

# 68040 additions/removals
print("\n68040 additions:")
print("  - FPU instructions (Fxxx)")
print("  - CAS/CAS2 (compare-and-swap)")
print("  - Some bitfield ops removed")

# Count opcodes per line
print("\n=== Opcode Count per Line ===")
for line in sorted(instructions_by_line.keys()):
    total = sum(len(opcodes) for opcodes in instructions_by_line[line].values())
    print(f"Line {line:X}: {len(instructions_by_line[line])} types, {total} opcodes")
