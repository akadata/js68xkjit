#!/usr/bin/env python3
# Update j68.js with AND/OR/EOR implementation (decode0)

with open('/home/smalley/reference/j68k/src/j68.js', 'r') as f:
    content = f.read()

# Replace decode0 with full AND/OR/EOR implementation
old_decode0 = '''    j68.prototype.decode0 = function (pc, inst) {
        var opmode = (inst >> 6) & 0x3f;
        // Check for ANDI/ORI/EORI to CCR/SR
        if ((inst & 0xff00) === 0x023c) {  // ANDI to CCR
            var data = this.context.fetch(pc + 2);
            return { 'code': ['c.setCcr(c.sr&' + (data&0xff) + ');'], 'pc': pc + 4 };
        }
        if ((inst & 0xff00) === 0x027c) {  // ANDI to SR
            var data = this.context.fetch(pc + 2);
            return { 'code': ['c.sr=c.sr&' + data + ';c.syncSr();'], 'pc': pc + 4 };
        }
        if ((inst & 0xff00) === 0x003c) {  // ORI to CCR
            var data = this.context.fetch(pc + 2);
            return { 'code': ['c.setCcr(c.sr|' + (data&0xff) + ');'], 'pc': pc + 4 };
        }
        if ((inst & 0xff00) === 0x007c) {  // ORI to SR
            var data = this.context.fetch(pc + 2);
            return { 'code': ['c.sr=c.sr|' + data + ';c.syncSr();'], 'pc': pc + 4 };
        }
        if ((inst & 0xff00) === 0x0a3c) {  // EORI to CCR
            var data = this.context.fetch(pc + 2);
            return { 'code': ['c.setCcr(c.sr^' + (data&0xff) + ');'], 'pc': pc + 4 };
        }
        if ((inst & 0xff00) === 0x0a7c) {  // EORI to SR
            var data = this.context.fetch(pc + 2);
            return { 'code': ['c.sr=c.sr^' + data + ';c.syncSr();'], 'pc': pc + 4 };
        }
        // Default: not implemented
        this.log('not impl: line=0, opmode=' + opmode.toString(16));
        throw console.assert(false);
    };'''

new_decode0 = '''    j68.prototype.decode0 = function (pc, inst) {
        var opmode = (inst >> 6) & 0x3f;
        var r = (inst >> 9) & 7;
        
        // Check for ANDI/ORI/EORI to CCR/SR
        if ((inst & 0xff00) === 0x023c) {  // ANDI to CCR
            var data = this.context.fetch(pc + 2);
            return { 'code': ['c.setCcr(c.sr&' + (data&0xff) + ');'], 'pc': pc + 4 };
        }
        if ((inst & 0xff00) === 0x027c) {  // ANDI to SR
            var data = this.context.fetch(pc + 2);
            return { 'code': ['c.sr=c.sr&' + data + ';c.syncSr();'], 'pc': pc + 4 };
        }
        if ((inst & 0xff00) === 0x003c) {  // ORI to CCR
            var data = this.context.fetch(pc + 2);
            return { 'code': ['c.setCcr(c.sr|' + (data&0xff) + ');'], 'pc': pc + 4 };
        }
        if ((inst & 0xff00) === 0x007c) {  // ORI to SR
            var data = this.context.fetch(pc + 2);
            return { 'code': ['c.sr=c.sr|' + data + ';c.syncSr();'], 'pc': pc + 4 };
        }
        if ((inst & 0xff00) === 0x0a3c) {  // EORI to CCR
            var data = this.context.fetch(pc + 2);
            return { 'code': ['c.setCcr(c.sr^' + (data&0xff) + ');'], 'pc': pc + 4 };
        }
        if ((inst & 0xff00) === 0x0a7c) {  // EORI to SR
            var data = this.context.fetch(pc + 2);
            return { 'code': ['c.sr=c.sr^' + data + ';c.syncSr();'], 'pc': pc + 4 };
        }
        
        // Determine size from opmode bits
        var size = 1;
        var sizeMask = '0xff';
        var highBit = '0x80';
        if ((opmode & 1) === 1) { size = 2; sizeMask = '0xffff'; highBit = '0x8000'; }
        if ((opmode & 0x10) === 0x10) { size = 4; sizeMask = '0xffffffff'; highBit = '0x80000000'; }
        
        // AND (opmode 0x00-0x03, 0x10-0x13)
        if ((opmode & 0x13) === 0x00 || (opmode & 0x13) === 0x10) {
            var dstReg = r;
            var srcInst = inst & 0x3f;
            var ea = this.effectiveAddress(
                pc, srcInst,
                function (ea) { return 'var src=(' + ea + ')&' + sizeMask + ';c.d[' + dstReg + ']&=src;'; },
                function (ea) { 
                    if (size === 1) return 'var src=c.l8(' + ea + ');c.d[' + dstReg + ']=(c.d[' + dstReg + ']&src)&0xffffffff;';
                    if (size === 2) return 'var src=c.l16(' + ea + ');c.d[' + dstReg + ']=(c.d[' + dstReg + ']&src)&0xffffffff;';
                    return 'var src=c.l32(' + ea + ');c.d[' + dstReg + ']=c.d[' + dstReg + ']&src;';
                },
                size);
            return {
                'code': [ea.code],
                'out': { 'n': '((c.d[' + dstReg + ']&' + highBit + ')!=0)', 'z': '((c.d[' + dstReg + ']&' + sizeMask + ')==0)', 'v': '0', 'c': '0' },
                'pc': ea.pc
            };
        }
        
        // OR (opmode 0x08-0x0B, 0x18-0x1B)
        if ((opmode & 0x18) === 0x08 || (opmode & 0x18) === 0x18) {
            var dstReg = r;
            var srcInst = inst & 0x3f;
            var ea = this.effectiveAddress(
                pc, srcInst,
                function (ea) { return 'var src=(' + ea + ')&' + sizeMask + ';c.d[' + dstReg + ']|=src;'; },
                function (ea) { 
                    if (size === 1) return 'var src=c.l8(' + ea + ');c.d[' + dstReg + ']=(c.d[' + dstReg + ']|src)&0xffffffff;';
                    if (size === 2) return 'var src=c.l16(' + ea + ');c.d[' + dstReg + ']=(c.d[' + dstReg + ']|src)&0xffffffff;';
                    return 'var src=c.l32(' + ea + ');c.d[' + dstReg + ']=c.d[' + dstReg + ']|src;';
                },
                size);
            return {
                'code': [ea.code],
                'out': { 'n': '((c.d[' + dstReg + ']&' + highBit + ')!=0)', 'z': '((c.d[' + dstReg + ']&' + sizeMask + ')==0)', 'v': '0', 'c': '0' },
                'pc': ea.pc
            };
        }
        
        // EOR (opmode 0x09, 0x19) - EOR Dn, EA
        if ((opmode & 0x1B) === 0x09 || (opmode & 0x1B) === 0x19) {
            var srcReg = r;
            var ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return ea + '^=c.d[' + srcReg + '];'; },
                function (ea) { 
                    if (size === 1) return 'c.s8(' + ea + ',c.l8(' + ea + ')^c.d[' + srcReg + ']);';
                    if (size === 2) return 'c.s16(' + ea + ',c.l16(' + ea + ')^c.d[' + srcReg + ']);';
                    return 'c.s32(' + ea + ',c.l32(' + ea + ')^c.d[' + srcReg + ']);';
                },
                size);
            return {
                'code': [ea.code],
                'out': { 'n': '((' + ea + '&'+ highBit + ')!=0)', 'z': '((' + ea + '&'+ sizeMask + ')==0)', 'v': '0', 'c': '0' },
                'pc': ea.pc
            };
        }
        
        // Default: not implemented
        this.log('not impl: line=0, opmode=' + opmode.toString(16));
        throw console.assert(false);
    };'''

content = content.replace(old_decode0, new_decode0)

with open('/home/smalley/reference/j68k/src/j68.js', 'w') as f:
    f.write(content)

print("Updated decode0 (AND/OR/EOR)")
