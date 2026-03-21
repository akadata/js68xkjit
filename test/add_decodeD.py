#!/usr/bin/env python3
with open('/home/smalley/reference/j68k/src/j68.js', 'r') as f:
    content = f.read()

# Replace the decodeD default case with proper ADD handling
old_decodeD = '''    j68.prototype.decodeD = function (pc, inst) {
        // ADDX, ADDA, ADD
        var r = (inst >> 9) & 7;
        var opmode = (inst >> 6) & 7;
        var code = [];
        var ea;
        switch (opmode) {
            case 7:  // ADDAL
                var ea = this.effectiveAddress(
                        pc, inst,
                        function (ea) { return 'c.a[' + r + ']+=' + ea + ';'; },
                        function (ea) { return 'c.a[' + r + ']+=c.l32(' + ea + ');'; },
                        4);
                code.push(ea.code);
                break;
            default:
                // TODO: Implement other opmode.
                // SUB will need condition update.
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

content = content.replace(old_decodeD, new_decodeD)

with open('/home/smalley/reference/j68k/src/j68.js', 'w') as f:
    f.write(content)

print("Done")
