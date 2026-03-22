#!/usr/bin/env python3
# Fix ANDI/ORI/EORI - use correct bit patterns

with open('/home/smalley/reference/j68k/src/j68.js', 'r') as f:
    content = f.read()

# Replace the entire ANDI/ORI/EORI to Dn section
old_text = '''        // ANDI/ORI/EORI to Dn
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
            if ((inst & 0xff00) === 0x0200) {
                return {
                    'code': ['c.d[' + dstReg + ']=(c.d[' + dstReg + ']&' + immData + ')&' + sizeMask + ';'],
                    'out': { 'n': '((c.d[' + dstReg + ']&' + highBit + ')!=0)', 'z': '((c.d[' + dstReg + ']&' + sizeMask + ')==0)', 'v': '0', 'c': '0' },
                    'pc': pc + 4
                };
            }
            // ORI (00000000xxxxxx)
            if ((inst & 0xff00) === 0x0000) {
                return {
                    'code': ['c.d[' + dstReg + ']=(c.d[' + dstReg + ']|' + immData + ')&' + sizeMask + ';'],
                    'out': { 'n': '((c.d[' + dstReg + ']&' + highBit + ')!=0)', 'z': '((c.d[' + dstReg + ']&' + sizeMask + ')==0)', 'v': '0', 'c': '0' },
                    'pc': pc + 4
                };
            }
            // EORI (00001010xxxxxx)
            if ((inst & 0xff00) === 0x0a00) {
                return {
                    'code': ['c.d[' + dstReg + ']=(c.d[' + dstReg + ']^' + immData + ')&' + sizeMask + ';'],
                    'out': { 'n': '((c.d[' + dstReg + ']&' + highBit + ')!=0)', 'z': '((c.d[' + dstReg + ']&' + sizeMask + ')==0)', 'v': '0', 'c': '0' },
                    'pc': pc + 4
                };
            }
        }'''

new_text = '''        // ANDI/ORI/EORI to Dn
        // ANDI: 00000010ss000ddd, ORI: 00000000ss000ddd, EORI: 00001010ss000ddd
        // where ss = size (00=B, 01=W, 10=L)
        var upperByte = (inst >> 8) & 0xff;
        if ((inst & 0x3f) === 0x00 && (upperByte & 0xf0) === 0x00) {  // EA mode 0 = Dn, upper nibble = 0
            var dstReg = inst & 7;
            var immData = this.context.fetch(pc + 2);
            
            // Determine size from bits 6-7
            var size = 1;
            var sizeMask = '0xff';
            var highBit = '0x80';
            var sizeBits = (inst >> 6) & 3;
            if (sizeBits === 1) { size = 2; sizeMask = '0xffff'; highBit = '0x8000'; }
            if (sizeBits === 2) { size = 4; sizeMask = '0xffffffff'; highBit = '0x80000000'; }
            
            // ANDI (00000010xxxxxx = 0x02xx)
            if (upperByte === 0x02) {
                return {
                    'code': ['c.d[' + dstReg + ']=(c.d[' + dstReg + ']&' + immData + ')&' + sizeMask + ';'],
                    'out': { 'n': '((c.d[' + dstReg + ']&' + highBit + ')!=0)', 'z': '((c.d[' + dstReg + ']&' + sizeMask + ')==0)', 'v': '0', 'c': '0' },
                    'pc': pc + 4
                };
            }
            // ORI (00000000xxxxxx = 0x00xx)
            if (upperByte === 0x00) {
                return {
                    'code': ['c.d[' + dstReg + ']=(c.d[' + dstReg + ']|' + immData + ')&' + sizeMask + ';'],
                    'out': { 'n': '((c.d[' + dstReg + ']&' + highBit + ')!=0)', 'z': '((c.d[' + dstReg + ']&' + sizeMask + ')==0)', 'v': '0', 'c': '0' },
                    'pc': pc + 4
                };
            }
            // EORI (00001010xxxxxx = 0x0Axx)
            if (upperByte === 0x0a) {
                return {
                    'code': ['c.d[' + dstReg + ']=(c.d[' + dstReg + ']^' + immData + ')&' + sizeMask + ';'],
                    'out': { 'n': '((c.d[' + dstReg + ']&' + highBit + ')!=0)', 'z': '((c.d[' + dstReg + ']&' + sizeMask + ')==0)', 'v': '0', 'c': '0' },
                    'pc': pc + 4
                };
            }
        }'''

content = content.replace(old_text, new_text)

with open('/home/smalley/reference/j68k/src/j68.js', 'w') as f:
    f.write(content)

print("Fixed ANDI/ORI/EORI bit pattern detection")
