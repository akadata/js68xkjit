
    // Line 0: Bit test/modify, immediate logic
    j68.prototype.decode0 = function (pc, inst) {
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
    };
    
    // Line 1: MOVE.b
    j68.prototype.decode1 = function (pc, inst) {
        var dstReg = (inst >> 9) & 7;
        var dstMode = (inst >> 6) & 7;
        var srcInst = inst & 0x1ff;
        var ea = this.effectiveAddress(
            pc, srcInst,
            function (ea) { return 'c.d[' + dstReg + ']=(' + ea + ')&0xff;'; },
            function (ea) { return 'c.d[' + dstReg + ']=c.l8(' + ea + ')&0xff;'; },
            1
        );
        return {
            'code': [ ea.code ],
            'out': this.flagMove('c.d[' + dstReg + ']'),
            'pc': ea.pc
        };
    };
    
    // Line 3: MOVE.w
    j68.prototype.decode3 = function (pc, inst) {
        var dstReg = (inst >> 9) & 7;
        var dstMode = (inst >> 6) & 7;
        if (dstMode === 1) {  // MOVEA.w
            var srcInst = inst & 0x1ff;
            var ea = this.effectiveAddress(
                pc, srcInst,
                function (ea) { return 'c.a[' + dstReg + ']=this.xw(' + ea + '&0xffff);'; },
                function (ea) { return 'c.a[' + dstReg + ']=this.xw(c.l16(' + ea + ')&0xffff);'; },
                2
            );
            return { 'code': [ ea.code ], 'pc': ea.pc };
        }
        var srcInst = inst & 0x1ff;
        var ea = this.effectiveAddress(
            pc, srcInst,
            function (ea) { return 'c.d[' + dstReg + ']=(' + ea + ')&0xffff;'; },
            function (ea) { return 'c.d[' + dstReg + ']=c.l16(' + ea + ')&0xffff;'; },
            2
        );
        return {
            'code': [ ea.code ],
            'out': this.flagMove('c.d[' + dstReg + ']'),
            'pc': ea.pc
        };
    };
    
    // Line A: Trap/A-line
    j68.prototype.decodeA = function (pc, inst) {
        return {
            'code': ['c.f(' + inst + ');'],
            'pc': pc + 2,
            'quit': true
        };
    };
    
    // Line B: CMP/CMPA/CMPI
    j68.prototype.decodeB = function (pc, inst) {
        var r = (inst >> 9) & 7;
        var opmode = (inst >> 6) & 7;
        // CMPA
        if ((opmode & 7) === 7) {
            var size = (inst & 0x100) ? 4 : 2;
            var ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return ''; },
                function (ea) { 
                    if (size === 4) return 'var src=c.l32(' + ea + ');var dst=c.a[' + r + '];';
                    return 'var src=this.xw(c.l16(' + ea + '));var dst=c.a[' + r + '];';
                },
                size
            );
            return {
                'code': [ea.code, 'c.cn=((dst-src)>>31);c.cz=(dst===src);'],
                'out': { 'n': 'c.cn', 'z': 'c.cz', 'v': '0', 'c': '0' },
                'pc': ea.pc
            };
        }
        // Default CMP
        this.log('not impl: line=B, opmode=' + opmode.toString(16));
        throw console.assert(false);
    };
    
    // Line C: MULS/MULU, AND, EXG
    j68.prototype.decodeC = function (pc, inst) {
        var r = (inst >> 9) & 7;
        var opmode = (inst >> 6) & 7;
        // MULS
        if (opmode === 7) {
            var ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return 'c.d[' + r + ']=this.xw(' + ea + ')*this.xw(c.d[' + r + ']&0xffff);'; },
                function (ea) { return 'c.d[' + r + ']=this.xw(c.l16(' + ea + '))*this.xw(c.d[' + r + ']&0xffff);'; },
                2
            );
            return {
                'code': [ea.code],
                'out': this.flagMove('c.d[' + r + ']'),
                'pc': ea.pc
            };
        }
        // MULU
        if (opmode === 1) {
            var ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return 'c.d[' + r + ']=(' + ea + '&0xffff)*(c.d[' + r + ']&0xffff);'; },
                function (ea) { return 'c.d[' + r + ']=(c.l16(' + ea + ')&0xffff)*(c.d[' + r + ']&0xffff);'; },
                2
            );
            return {
                'code': [ea.code],
                'out': this.flagMove('c.d[' + r + ']'),
                'pc': ea.pc
            };
        }
        // EXG
        if (opmode === 7 && (inst & 0x38) === 8) {
            var r2 = inst & 7;
            var exgType = (inst >> 3) & 7;
            if (exgType === 0) {  // Dn<->Dn
                return { 'code': ['var t=c.d[' + r + '];c.d[' + r + ']=c.d[' + r2 + '];c.d[' + r2 + ']=t;'], 'pc': pc + 2 };
            }
            if (exgType === 1) {  // An<->An
                return { 'code': ['var t=c.a[' + r + '];c.a[' + r + ']=c.a[' + r2 + '];c.a[' + r2 + ']=t;'], 'pc': pc + 2 };
            }
            if (exgType === 2) {  // Dn<->An
                return { 'code': ['var t=c.d[' + r + '];c.d[' + r + ']=c.a[' + r2 + '];c.a[' + r2 + ']=t;'], 'pc': pc + 2 };
            }
        }
        // Default AND
        this.log('not impl: line=C, opmode=' + opmode.toString(16));
        throw console.assert(false);
    };
    
    // Line E: Shift/Rotate
    j68.prototype.decodeE = function (pc, inst) {
        var r = inst & 7;
        var dir = (inst >> 8) & 1;
        var arith = (inst >> 11) & 1;
        var rotate = (inst >> 10) & 1;
        var count = (inst >> 9) & 7;
        if (count === 0) count = 8;
        
        // Register shifts only (memory shifts not implemented)
        if ((inst & 0x20) !== 0) {
            this.log('not impl: line=E memory shift');
            throw console.assert(false);
        }
        
        var shiftType = (dir << 2) | (arith << 1) | rotate;
        var code = [];
        switch (shiftType) {
            case 0:  // ASL
                code.push('c.d[' + r + ']<<=' + count + ';');
                break;
            case 1:  // ASR
                code.push('c.d[' + r + ']=this.xw(c.d[' + r + ']>>' + count + ');');
                break;
            case 2:  // LSL
                code.push('c.d[' + r + ']<<=' + count + ';');
                break;
            case 3:  // LSR
                code.push('c.d[' + r + ']>>=' + count + ';');
                break;
            case 4:  // ROL
                code.push('c.d[' + r + ']=((c.d[' + r + ']<<' + count + ')|(c.d[' + r + ']>>>(32-' + count + ')))&0xffffffff;');
                break;
            case 5:  // ROR
                code.push('c.d[' + r + ']=((c.d[' + r + ']>>> ' + count + ')|(c.d[' + r + ']<<(32-' + count + ')))&0xffffffff;');
                break;
            case 6:  // ROXL
                code.push('// ROXL D' + r);
                break;
            case 7:  // ROXR
                code.push('// ROXR D' + r);
                break;
        }
        return {
            'code': code,
            'out': this.flagMove('c.d[' + r + ']'),
            'pc': pc + 2
        };
    };

})();
