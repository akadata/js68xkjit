#!/usr/bin/env python3
# Fix ANDI/ORI/EORI opmode detection

with open('/home/smalley/reference/j68k/src/j68.js', 'r') as f:
    content = f.read()

# The issue is opmode detection - ANDI.W to Dn has inst=0x0240
# inst >> 6 = 0x09, not 0x02
# We need to check the actual instruction pattern

old_text = '''        // ANDI/ORI/EORI to Dn (opmode 0x02, 0x00, 0x0a with EA mode 0)
        if ((inst & 0x3f) === 0x00) {  // EA mode 0 = Dn
            var dstReg = inst & 7;
            var immData = this.context.fetch(pc + 2);
            
            // ANDI (0000000010xxxxxx)
            if ((inst & 0xf000) === 0x0000 && (inst & 0x0f00) === 0x0200) {'''

new_text = '''        // ANDI/ORI/EORI to Dn
        // ANDI: 00000010ss000ddd, ORI: 00000000ss000ddd, EORI: 00001010ss000ddd
        if ((inst & 0x3f) === 0x00) {  // EA mode 0 = Dn
            var dstReg = inst & 7;
            var immData = this.context.fetch(pc + 2);
            
            // Determine size from bits 6-7
            var size = 1;
            var sizeMask = '0xff';
            var highBit = '0x80';
            var sizeBits = (inst >> 6) & 3;
            if (sizeBits === 1) { size = 2; sizeMask = '0xffff'; highBit = '0x8000'; }
            if (sizeBits === 2) { size = 4; sizeMask = '0xffffffff'; highBit = '0x80000000'; }
            
            // ANDI (00000010xxxxxx)
            if ((inst & 0xff00) === 0x0200) {'''

content = content.replace(old_text, new_text)

# Also fix ORI and EORI patterns
old_ori = '''            // ORI (0000000000xxxxxx)
            if ((inst & 0xf000) === 0x0000 && (inst & 0x0f00) === 0x0000) {
                var size = 1;
                var sizeMask = '0xff';
                var highBit = '0x80';
                if ((inst & 0x0100) !== 0) { size = 2; sizeMask = '0xffff'; highBit = '0x8000'; }
                if ((inst & 0x1000) !== 0) { size = 4; sizeMask = '0xffffffff'; highBit = '0x80000000'; }'''

new_ori = '''            // ORI (00000000xxxxxx)
            if ((inst & 0xff00) === 0x0000) {'''

content = content.replace(old_ori, new_ori)

old_eori = '''            // EORI (00001010xxxxxx)
            if ((inst & 0xf000) === 0x0000 && (inst & 0x0f00) === 0x0a00) {
                var size = 1;
                var sizeMask = '0xff';
                var highBit = '0x80';
                if ((inst & 0x0100) !== 0) { size = 2; sizeMask = '0xffff'; highBit = '0x8000'; }
                if ((inst & 0x1000) !== 0) { size = 4; sizeMask = '0xffffffff'; highBit = '0x80000000'; }'''

new_eori = '''            // EORI (00001010xxxxxx)
            if ((inst & 0xff00) === 0x0a00) {'''

content = content.replace(old_eori, new_eori)

with open('/home/smalley/reference/j68k/src/j68.js', 'w') as f:
    f.write(content)

print("Fixed ANDI/ORI/EORI opmode detection")
