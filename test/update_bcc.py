#!/usr/bin/env python3
# Update decode6 to handle Bcc and BSR

with open('/home/smalley/reference/j68k/src/j68.js', 'r') as f:
    content = f.read()

old_decode6 = '''    j68.prototype.decode6 = function (pc, inst) {
        var cond = (inst >> 8) & 0xf;
        var disp = inst & 0xff;
        var nextPc = pc;
        if (cond === 0) {
            // BRA
            if (disp === 0) {
                // 16-bit disp.
                disp = this.context.fetch(pc + 2);
                nextPc = this.addU32S16(pc + 2, disp);
            } else if (this.type != j68.TYPE_MC68000 && disp == 0xff) {
                // 32-bit disp.
                // TODO: Implement.
                throw console.assert(false);
            } else {
                nextPc = this.addU32S8(pc + 2, disp);
            }
            return {
                'pc': nextPc,
                'quit': true
            }
        }
        // TODO: Implement BSR, Bcc
        throw console.assert(false);
    };'''

new_decode6 = '''    j68.prototype.decode6 = function (pc, inst) {
        var cond = (inst >> 8) & 0xf;
        var disp = inst & 0xff;
        var nextPc = pc;
        var dispPc = pc + 2;
        
        // Calculate displacement
        if (disp === 0) {
            // 16-bit disp
            disp = this.context.fetch(pc + 2);
            nextPc = this.addU32S16(pc + 2, disp);
            dispPc = pc + 4;
        } else if (disp == 0xff && this.type !== j68.TYPE_MC68000) {
            // 32-bit disp (68020+)
            disp = this.context.fetch(pc + 2);
            var disp2 = this.context.fetch(pc + 4);
            nextPc = (disp << 16) | disp2;
            dispPc = pc + 6;
        } else {
            // 8-bit disp
            nextPc = this.addU32S8(pc + 2, disp);
        }
        
        if (cond === 0) {
            // BRA - always branch
            return { 'pc': nextPc, 'quit': true };
        }
        
        if (cond === 1) {
            // BSR - branch to subroutine
            return {
                'code': ['c.a[7]-=4;c.s32(c.a[7],' + dispPc + ');'],
                'pc': nextPc,
                'quit': true
            };
        }
        
        // Bcc - conditional branch
        // Condition codes:
        // 2=HI/CS, 3=LS/CC, 4=MI, 5=PL, 6=NE, 7=EQ
        // 8=VC, 9=VS, 10=CC/HS, 11=CS/LO, 12=GE, 13=LT, 14=GT, 15=LE
        var condCode = '';
        switch (cond) {
            case 2: condCode = '0'; break;  // HI/CS - TODO
            case 3: condCode = '!0'; break;  // LS/CC - TODO
            case 4: condCode = 'c.cn'; break;  // MI
            case 5: condCode = '!c.cn'; break;  // PL
            case 6: condCode = '!c.cz'; break;  // NE
            case 7: condCode = 'c.cz'; break;  // EQ
            case 8: condCode = '!c.cv'; break;  // VC
            case 9: condCode = 'c.cv'; break;  // VS
            case 10: condCode = '!c.cc'; break;  // CC/HS
            case 11: condCode = 'c.cc'; break;  // CS/LO
            case 12: condCode = '(c.cn===c.cv)'; break;  // GE
            case 13: condCode = '(c.cn!==c.cv)'; break;  // LT
            case 14: condCode = '(!c.cz&&(c.cn===c.cv))'; break;  // GT
            case 15: condCode = '(c.cz||(c.cn!==c.cv))'; break;  // LE
        }
        
        return {
            'code': ['if(' + condCode + '){c.pc=' + nextPc + ';}else{c.pc=' + dispPc + ';}'],
            'pc': nextPc,
            'quit': true
        };
    };'''

content = content.replace(old_decode6, new_decode6)

with open('/home/smalley/reference/j68k/src/j68.js', 'w') as f:
    f.write(content)

print("Updated decode6 (Bcc/BSR)")
