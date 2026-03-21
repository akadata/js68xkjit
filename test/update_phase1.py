#!/usr/bin/env python3
# Update j68.js with Phase 1 implementations

with open('/home/smalley/reference/j68k/src/j68.js', 'r') as f:
    content = f.read()

# Replace decodeD with full ADD implementation
old_decodeD = '''    j68.prototype.decodeD = function (pc, inst) {
        // ADDX, ADDA, ADD
        var r = (inst >> 9) & 7;
        var opmode = (inst >> 6) & 7;
        var code = [];
        var ea;
        switch (opmode) {
            case 7:  // ADDA.L
                ea = this.effectiveAddress(
                        pc, inst,
                        function (ea) { return 'c.a[' + r + ']+=' + ea + ';'; },
                        function (ea) { return 'c.a[' + r + ']+=c.l32(' + ea + ');'; },
                        4);
                code.push(ea.code);
                break;
            case 3:  // ADDA.W
                ea = this.effectiveAddress(
                        pc, inst,
                        function (ea) { return 'c.a[' + r + ']+=this.xw(' + ea + '&0xffff);'; },
                        function (ea) { return 'c.a[' + r + ']+=this.xw(c.l16(' + ea + ')&0xffff);'; },
                        2);
                code.push(ea.code);
                break;
            case 0:  // ADD.b Dn, Dn
                var srcReg = r;
                var dstReg = (inst >> 0) & 7;
                return {
                    'code': ['c.d[' + dstReg + ']+=c.d[' + srcReg + '];'],
                    'out': { 'n': '(c.d[' + dstReg + ']>>31)', 'z': '(c.d[' + dstReg + ']==0)', 'v': '0', 'c': '0' },
                    'pc': pc + 2
                };
            case 1:  // ADD.w Dn, Dn
                var srcReg = r;
                var dstReg = (inst >> 0) & 7;
                return {
                    'code': ['c.d[' + dstReg + ']=(c.d[' + dstReg + ']+(c.d[' + srcReg + ']&0xffff))&0xffff;'],
                    'out': { 'n': '((c.d[' + dstReg + '])>>31)', 'z': '((c.d[' + dstReg + ']&0xffff)==0)', 'v': '0', 'c': '0' },
                    'pc': pc + 2
                };
            case 2:  // ADD.l Dn, Dn
                var srcReg = r;
                var dstReg = (inst >> 0) & 7;
                return {
                    'code': ['c.d[' + dstReg + ']+=c.d[' + srcReg + '];'],
                    'out': { 'n': '(c.d[' + dstReg + ']>>31)', 'z': '(c.d[' + dstReg + ']==0)', 'v': '0', 'c': '0' },
                    'pc': pc + 2
                };
            default:
                this.log('add not impl opmode: ' + opmode);
                throw console.assert(false);
        }
        return {
            'code': code,
            'pc': ea.pc
        };
    };'''

new_decodeD = '''    j68.prototype.decodeD = function (pc, inst) {
        // ADDX, ADDA, ADD
        var r = (inst >> 9) & 7;
        var opmode = (inst >> 6) & 7;
        var code = [];
        var ea;
        
        // Determine size
        var size = 4;  // default long
        var sizeMask = '0xffffffff';
        var highBit = '0x80000000';
        if (opmode === 0 || opmode === 4) { size = 1; sizeMask = '0xff'; highBit = '0x80'; }
        else if (opmode === 1 || opmode === 5) { size = 2; sizeMask = '0xffff'; highBit = '0x8000'; }
        
        switch (opmode) {
            case 7:  // ADDA.L
                ea = this.effectiveAddress(
                        pc, inst,
                        function (ea) { return 'c.a[' + r + ']+=' + ea + ';'; },
                        function (ea) { return 'c.a[' + r + ']+=c.l32(' + ea + ');'; },
                        4);
                code.push(ea.code);
                return { 'code': code, 'pc': ea.pc };  // ADDA doesn't set flags
                
            case 3:  // ADDA.W
                ea = this.effectiveAddress(
                        pc, inst,
                        function (ea) { return 'c.a[' + r + ']+=this.xw(' + ea + '&0xffff);'; },
                        function (ea) { return 'c.a[' + r + ']+=this.xw(c.l16(' + ea + ')&0xffff);'; },
                        2);
                code.push(ea.code);
                return { 'code': code, 'pc': ea.pc };  // ADDA doesn't set flags
                
            case 4:  // ADD.b EA, Dn
            case 5:  // ADD.w EA, Dn
            case 6:  // ADD.l EA, Dn
                ea = this.effectiveAddress(
                    pc, inst,
                    function (ea) { 
                        return 'var src=(' + ea + ')&' + sizeMask + ';var dst=c.d[' + r + '];var res=(dst+src)&' + sizeMask + ';c.d[' + r + ']=res;'; 
                    },
                    function (ea) { 
                        if (size === 1) return 'var src=c.l8(' + ea + ');var dst=c.d[' + r + '];var res=(dst+src)&0xff;c.d[' + r + ']=res;';
                        if (size === 2) return 'var src=c.l16(' + ea + ');var dst=c.d[' + r + '];var res=(dst+src)&0xffff;c.d[' + r + ']=res;';
                        return 'var src=c.l32(' + ea + ');var dst=c.d[' + r + '];var res=(dst+src);c.d[' + r + ']=res;';
                    },
                    size);
                code.push(ea.code);
                code.push('c.cn=((res&' + highBit + ')!=0);c.cz=((res&' + sizeMask + ')==0);');
                code.push('c.cv=((dst&' + highBit + ')==(src&' + highBit + '))&&((res&' + highBit + ')!=(dst&' + highBit + '));');
                code.push('c.cc=((res&' + sizeMask + ')<(dst&' + sizeMask + '));');
                return { 
                    'code': code, 
                    'out': { 'n': 'c.cn', 'z': 'c.cz', 'v': 'c.cv', 'c': 'c.cc', 'x': 'c.cc' },
                    'pc': ea.pc 
                };
                
            case 0:  // ADD.b Dn, Dn
            case 1:  // ADD.w Dn, Dn  
            case 2:  // ADD.l Dn, Dn
                var srcReg = r;
                var dstReg = (inst >> 0) & 7;
                code.push('var src=c.d[' + srcReg + ']&' + sizeMask + ';');
                code.push('var dst=c.d[' + dstReg + '];');
                code.push('var res=(dst+src)&' + sizeMask + ';');
                code.push('c.d[' + dstReg + ']=res;');
                code.push('c.cn=((res&' + highBit + ')!=0);c.cz=((res&' + sizeMask + ')==0);');
                code.push('c.cv=((dst&' + highBit + ')==(src&' + highBit + '))&&((res&' + highBit + ')!=(dst&' + highBit + '));');
                code.push('c.cc=((res&' + sizeMask + ')<(dst&' + sizeMask + '));');
                return { 
                    'code': code, 
                    'out': { 'n': 'c.cn', 'z': 'c.cz', 'v': 'c.cv', 'c': 'c.cc', 'x': 'c.cc' },
                    'pc': pc + 2 
                };
                
            default:
                this.log('add not impl opmode: ' + opmode);
                throw console.assert(false);
        }
    };'''

content = content.replace(old_decodeD, new_decodeD)

with open('/home/smalley/reference/j68k/src/j68.js', 'w') as f:
    f.write(content)

print("Updated decodeD (ADD)")
