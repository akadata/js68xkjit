#!/usr/bin/env python3
# Add ANDI/ORI/EORI to Dn support in decode0

with open('/home/smalley/reference/j68k/src/j68.js', 'r') as f:
    content = f.read()

# Find the end of the EORI to SR block and add ANDI/ORI/EORI to Dn
old_text = '''        if ((inst & 0xff00) === 0x0a7c) {  // EORI to SR
            var data = this.context.fetch(pc + 2);
            return { 'code': ['c.sr=c.sr^' + data + ';c.syncSr();'], 'pc': pc + 4 };
        }
        
        // Determine size from opmode bits'''

new_text = '''        if ((inst & 0xff00) === 0x0a7c) {  // EORI to SR
            var data = this.context.fetch(pc + 2);
            return { 'code': ['c.sr=c.sr^' + data + ';c.syncSr();'], 'pc': pc + 4 };
        }
        
        // ANDI/ORI/EORI to Dn (opmode 0x02, 0x00, 0x0a with EA mode 0)
        if ((inst & 0x3f) === 0x00) {  // EA mode 0 = Dn
            var dstReg = inst & 7;
            var immData = this.context.fetch(pc + 2);
            
            // ANDI (0000000010xxxxxx)
            if ((inst & 0xf000) === 0x0000 && (inst & 0x0f00) === 0x0200) {
                var size = 1;
                var sizeMask = '0xff';
                var highBit = '0x80';
                if ((inst & 0x0100) !== 0) { size = 2; sizeMask = '0xffff'; highBit = '0x8000'; }
                if ((inst & 0x1000) !== 0) { size = 4; sizeMask = '0xffffffff'; highBit = '0x80000000'; }
                return {
                    'code': ['c.d[' + dstReg + ']=(c.d[' + dstReg + ']&' + immData + ')&' + sizeMask + ';'],
                    'out': { 'n': '((c.d[' + dstReg + ']&' + highBit + ')!=0)', 'z': '((c.d[' + dstReg + ']&' + sizeMask + ')==0)', 'v': '0', 'c': '0' },
                    'pc': pc + 4
                };
            }
            // ORI (0000000000xxxxxx)
            if ((inst & 0xf000) === 0x0000 && (inst & 0x0f00) === 0x0000) {
                var size = 1;
                var sizeMask = '0xff';
                var highBit = '0x80';
                if ((inst & 0x0100) !== 0) { size = 2; sizeMask = '0xffff'; highBit = '0x8000'; }
                if ((inst & 0x1000) !== 0) { size = 4; sizeMask = '0xffffffff'; highBit = '0x80000000'; }
                return {
                    'code': ['c.d[' + dstReg + ']=(c.d[' + dstReg + ']|' + immData + ')&' + sizeMask + ';'],
                    'out': { 'n': '((c.d[' + dstReg + ']&' + highBit + ')!=0)', 'z': '((c.d[' + dstReg + ']&' + sizeMask + ')==0)', 'v': '0', 'c': '0' },
                    'pc': pc + 4
                };
            }
            // EORI (00001010xxxxxx)
            if ((inst & 0xf000) === 0x0000 && (inst & 0x0f00) === 0x0a00) {
                var size = 1;
                var sizeMask = '0xff';
                var highBit = '0x80';
                if ((inst & 0x0100) !== 0) { size = 2; sizeMask = '0xffff'; highBit = '0x8000'; }
                if ((inst & 0x1000) !== 0) { size = 4; sizeMask = '0xffffffff'; highBit = '0x80000000'; }
                return {
                    'code': ['c.d[' + dstReg + ']=(c.d[' + dstReg + ']^' + immData + ')&' + sizeMask + ';'],
                    'out': { 'n': '((c.d[' + dstReg + ']&' + highBit + ')!=0)', 'z': '((c.d[' + dstReg + ']&' + sizeMask + ')==0)', 'v': '0', 'c': '0' },
                    'pc': pc + 4
                };
            }
        }
        
        // Determine size from opmode bits'''

content = content.replace(old_text, new_text)

with open('/home/smalley/reference/j68k/src/j68.js', 'w') as f:
    f.write(content)

print("Added ANDI/ORI/EORI to Dn")
