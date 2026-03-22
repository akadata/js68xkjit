#!/usr/bin/env python3
# Fix ADDQ/SUBQ decode5

with open('/home/smalley/reference/j68k/src/j68.js', 'r') as f:
    content = f.read()

old_decode5 = '''    j68.prototype.decode5 = function (pc, inst) {
        // ADDQ
        var data = (inst >> 9) & 7;
        var zero = (inst >> 8) & 1;
        var size = (inst >> 6) & 3;
        var mode = (inst >> 3) & 7;
        var r = inst & 7;
        if (zero || size == 3) {
            // TODO: Unknown instruction.
            throw console.assert(false);
        }
        var code = [];
        if (mode == 0) {
            // TODO: Set conditions.
            code.push('c.d[' + r + ']+=' + (data << size) + ';');
        } else {
            // TODO: Implement.
            throw console.assert(false);
        }
        return {
            'code': code,
            'pc': pc + 2
        };
    }'''

new_decode5 = '''    j68.prototype.decode5 = function (pc, inst) {
        // ADDQ/SUBQ
        var data = (inst >> 9) & 7;
        if (data === 0) data = 8;  // 0 means 8
        var size = (inst >> 6) & 3;
        var mode = (inst >> 3) & 7;
        var r = inst & 7;
        
        var sizeMask = '0xffffffff';
        var highBit = '0x80000000';
        if (size === 0) { sizeMask = '0xff'; highBit = '0x80'; }
        else if (size === 1) { sizeMask = '0xffff'; highBit = '0x8000'; }
        
        // Check if SUBQ (bit 8 set in certain positions)
        var isSub = ((inst >> 8) & 1) === 1;
        
        if (mode === 0) {  // Dn mode
            var code = [];
            if (isSub) {
                code.push('var src=' + data + ';var dst=c.d[' + r + '];var res=(dst-src)&' + sizeMask + ';c.d[' + r + ']=res;');
                code.push('c.cn=((res&' + highBit + ')!=0);c.cz=((res&' + sizeMask + ')==0);');
                code.push('c.cv=((dst&' + highBit + ')!=(src&' + highBit + '))&&((res&' + highBit + ')!=(dst&' + highBit + '));');
                code.push('c.cc=((dst&' + sizeMask + ')<(src&' + sizeMask + '));');
                return { 
                    'code': code, 
                    'out': { 'n': 'c.cn', 'z': 'c.cz', 'v': 'c.cv', 'c': 'c.cc', 'x': 'c.cc' },
                    'pc': pc + 2 
                };
            } else {
                code.push('var src=' + data + ';var dst=c.d[' + r + '];var res=(dst+src)&' + sizeMask + ';c.d[' + r + ']=res;');
                code.push('c.cn=((res&' + highBit + ')!=0);c.cz=((res&' + sizeMask + ')==0);');
                code.push('c.cv=((dst&' + highBit + ')==(src&' + highBit + '))&&((res&' + highBit + ')!=(dst&' + highBit + '));');
                code.push('c.cc=((res&' + sizeMask + ')<(dst&' + sizeMask + '));');
                return { 
                    'code': code, 
                    'out': { 'n': 'c.cn', 'z': 'c.cz', 'v': 'c.cv', 'c': 'c.cc', 'x': 'c.cc' },
                    'pc': pc + 2 
                };
            }
        }
        
        // TODO: Implement other modes
        this.log('ADDQ/SUBQ not impl mode: ' + mode);
        throw console.assert(false);
    }'''

content = content.replace(old_decode5, new_decode5)

with open('/home/smalley/reference/j68k/src/j68.js', 'w') as f:
    f.write(content)

print("Fixed decode5 (ADDQ/SUBQ)")
