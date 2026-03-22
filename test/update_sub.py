#!/usr/bin/env python3
# Update j68.js with SUB implementation (decode9)

with open('/home/smalley/reference/j68k/src/j68.js', 'r') as f:
    content = f.read()

# Replace decode9 with full SUB implementation
old_decode9 = '''    j68.prototype.decode9 = function (pc, inst) {
        // SUB, SUBA, SUBX
        var r = (inst >> 9) & 7;
        var opmode = (inst >> 6) & 7;
        var code = [];
        var ea;
        switch (opmode) {
            case 7:  // SUBA.L
                ea = this.effectiveAddress(
                        pc, inst,
                        function (ea) { return 'c.a[' + r + ']-=' + ea + ';'; },
                        function (ea) { return 'c.a[' + r + ']-=c.l32(' + ea + ');'; },
                        4);
                code.push(ea.code);
                break;
            case 3:  // SUBA.W
                ea = this.effectiveAddress(
                        pc, inst,
                        function (ea) { return 'c.a[' + r + ']-=this.xw(' + ea + '&0xffff);'; },
                        function (ea) { return 'c.a[' + r + ']-=this.xw(c.l16(' + ea + ')&0xffff);'; },
                        2);
                code.push(ea.code);
                break;
            default:
                // SUB with flags
                var size = 1;
                if (opmode >= 4) size = 4;
                else if (opmode >= 2) size = 2;
                
                ea = this.effectiveAddress(
                    pc, inst,
                    function (ea) { return 'c.d[' + r + ']-=' + ea + ';'; },
                    function (ea) { 
                        if (size === 1) return 'c.d[' + r + ']-=c.l8(' + ea + ');';
                        if (size === 2) return 'c.d[' + r + ']-=c.l16(' + ea + ');';
                        return 'c.d[' + r + ']-=c.l32(' + ea + ');';
                    },
                    size
                );
                code.push(ea.code);
                break;
        }
        
        return { 'code': code, 'pc': ea.pc };
    };'''

new_decode9 = '''    j68.prototype.decode9 = function (pc, inst) {
        // SUBX, SUBA, SUB
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
            case 7:  // SUBA.L
                ea = this.effectiveAddress(
                        pc, inst,
                        function (ea) { return 'c.a[' + r + ']-=' + ea + ';'; },
                        function (ea) { return 'c.a[' + r + ']-=c.l32(' + ea + ');'; },
                        4);
                code.push(ea.code);
                return { 'code': code, 'pc': ea.pc };  // SUBA doesn't set flags
                
            case 3:  // SUBA.W
                ea = this.effectiveAddress(
                        pc, inst,
                        function (ea) { return 'c.a[' + r + ']-=this.xw(' + ea + '&0xffff);'; },
                        function (ea) { return 'c.a[' + r + ']-=this.xw(c.l16(' + ea + ')&0xffff);'; },
                        2);
                code.push(ea.code);
                return { 'code': code, 'pc': ea.pc };  // SUBA doesn't set flags
                
            case 4:  // SUB.b EA, Dn
            case 5:  // SUB.w EA, Dn
            case 6:  // SUB.l EA, Dn
                ea = this.effectiveAddress(
                    pc, inst,
                    function (ea) { 
                        return 'var src=(' + ea + ')&' + sizeMask + ';var dst=c.d[' + r + '];var res=(dst-src)&' + sizeMask + ';c.d[' + r + ']=res;'; 
                    },
                    function (ea) { 
                        if (size === 1) return 'var src=c.l8(' + ea + ');var dst=c.d[' + r + '];var res=(dst-src)&0xff;c.d[' + r + ']=res;';
                        if (size === 2) return 'var src=c.l16(' + ea + ');var dst=c.d[' + r + '];var res=(dst-src)&0xffff;c.d[' + r + ']=res;';
                        return 'var src=c.l32(' + ea + ');var dst=c.d[' + r + '];var res=(dst-src);c.d[' + r + ']=res;';
                    },
                    size);
                code.push(ea.code);
                code.push('c.cn=((res&' + highBit + ')!=0);c.cz=((res&' + sizeMask + ')==0);');
                code.push('c.cv=((dst&' + highBit + ')!=(src&' + highBit + '))&&((res&' + highBit + ')!=(dst&' + highBit + '));');
                code.push('c.cc=((dst&' + sizeMask + ')<(src&' + sizeMask + '));');
                return { 
                    'code': code, 
                    'out': { 'n': 'c.cn', 'z': 'c.cz', 'v': 'c.cv', 'c': 'c.cc', 'x': 'c.cc' },
                    'pc': ea.pc 
                };
                
            case 0:  // SUB.b Dn, Dn
            case 1:  // SUB.w Dn, Dn  
            case 2:  // SUB.l Dn, Dn
                var dstReg = r;  // Destination is in bits 9-11
                var srcReg = (inst >> 0) & 7;  // Source is in bits 0-2 for Dn mode
                code.push('var src=c.d[' + srcReg + ']&' + sizeMask + ';');
                code.push('var dst=c.d[' + dstReg + '];');
                code.push('var res=(dst-src)&' + sizeMask + ';');
                code.push('c.d[' + dstReg + ']=res;');
                code.push('c.cn=((res&' + highBit + ')!=0);c.cz=((res&' + sizeMask + ')==0);');
                code.push('c.cv=((dst&' + highBit + ')!=(src&' + highBit + '))&&((res&' + highBit + ')!=(dst&' + highBit + '));');
                code.push('c.cc=((dst&' + sizeMask + ')<(src&' + sizeMask + '));');
                return { 
                    'code': code, 
                    'out': { 'n': 'c.cn', 'z': 'c.cz', 'v': 'c.cv', 'c': 'c.cc', 'x': 'c.cc' },
                    'pc': pc + 2 
                };
                
            default:
                this.log('sub not impl opmode: ' + opmode);
                throw console.assert(false);
        }
    };'''

content = content.replace(old_decode9, new_decode9)

with open('/home/smalley/reference/j68k/src/j68.js', 'w') as f:
    f.write(content)

print("Updated decode9 (SUB)")
