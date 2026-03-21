    j68.prototype.decode4 = function (pc, inst) {
        var r = (inst >> 9) & 7;
        var op = (inst >> 6) & 7;
        var mode = (inst >> 3) & 7;
        var reg = inst & 7;
        var ea;
        
        // Check for NOP (0100111001110001)
        if (inst === 0x4e71) {
            return { 'code': [], 'pc': pc + 2 };
        }
        
        // Check for RTS (0100111001110101)
        if (inst === 0x4e75) {
            return {
                'code': ['c.pc=c.l32(c.a[7]);c.a[7]+=4;'],
                'pc': pc + 2,
                'quit': true
            };
        }
        
        // Check for RTR (0100111001110111)
        if (inst === 0x4e77) {
            return {
                'code': ['var ccr=c.l16(c.a[7]);c.a[7]+=2;c.setCcr(ccr&0xff);c.pc=c.l32(c.a[7]);c.a[7]+=4;'],
                'pc': pc + 2,
                'quit': true
            };
        }
        
        // Check for RTE (0100111001110011)
        if (inst === 0x4e73) {
            return {
                'code': ['c.sr=c.l16(c.a[7]);c.a[7]+=2;c.pc=c.l32(c.a[7]);c.a[7]+=4;c.syncSr();'],
                'pc': pc + 2,
                'quit': true
            };
        }
        
        // Check for RESET (0100111001110000)
        if (inst === 0x4e70) {
            return { 'code': ['// RESET'], 'pc': pc + 2 };
        }
        
        // Check for STOP (0100111001110010)
        if (inst === 0x4e72) {
            var data = this.context.fetch(pc + 2);
            return {
                'code': ['c.sr=' + data + ';c.syncSr();c.halt=true;'],
                'pc': pc + 4,
                'quit': true
            };
        }
        
        // Check for LEA (0100nnn111xxxxxx)
        if (op === 7) {
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return 'c.a[' + r + ']=' + ea + ';'; },
                function (ea) { return 'c.a[' + r + ']=' + ea + ';'; },
                4
            );
            return { 'code': [ea.code], 'pc': ea.pc };
        }
        
        // Check for PEA (01001000011xxxxx)
        if (op === 1 && r === 4) {
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return ''; },
                function (ea) { return ''; },
                4
            );
            return {
                'code': ['c.a[7]-=4;c.s32(c.a[7],' + ea.pc + ');'],
                'pc': pc + 2
            };
        }
        
        // Check for CLR (01000000size00xxxx)
        if (op === 0 && r === 0) {
            var size = (inst >> 6) & 3;
            var sizeBytes = size === 0 ? 1 : size === 1 ? 2 : 4;
            var sizeMask = size === 0 ? '0xff' : size === 1 ? '0xffff' : '0xffffffff';
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return ea + '=0;'; },
                function (ea) {
                    if (sizeBytes === 1) return 'c.s8(' + ea + ',0);';
                    if (sizeBytes === 2) return 'c.s16(' + ea + ',0);';
                    return 'c.s32(' + ea + ',0);';
                },
                sizeBytes
            );
            return {
                'code': [ea.code],
                'out': { 'n': '0', 'z': '1', 'v': '0', 'c': '0' },
                'pc': ea.pc
            };
        }
        
        // Check for NOT (01000110size00xxxx)
        if (op === 1 && r === 1) {
            var size = (inst >> 6) & 3;
            var sizeBytes = size === 0 ? 1 : size === 1 ? 2 : 4;
            var sizeMask = size === 0 ? '0xff' : size === 1 ? '0xffff' : '0xffffffff';
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return ea + '=~(' + ea + ')&(' + sizeMask + ');'; },
                function (ea) {
                    if (sizeBytes === 1) return 'c.s8(' + ea + ',~c.l8(' + ea + ')&0xff);';
                    if (sizeBytes === 2) return 'c.s16(' + ea + ',~c.l16(' + ea + ')&0xffff);';
                    return 'c.s32(' + ea + ',~c.l32(' + ea + '));';
                },
                sizeBytes
            );
            return {
                'code': [ea.code],
                'out': {
                    'n': '((' + ea + ')&' + (size===0?'0x80':size===1?'0x8000':'0x80000000') + ')',
                    'z': '((' + ea + ')==0)',
                    'v': '0', 'c': '0'
                },
                'pc': ea.pc
            };
        }
        
        // Check for NEG (01000100size00xxxx)
        if (op === 1 && r === 0) {
            var size = (inst >> 6) & 3;
            var sizeBytes = size === 0 ? 1 : size === 1 ? 2 : 4;
            var sizeMask = size === 0 ? '0xff' : size === 1 ? '0xffff' : '0xffffffff';
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return ea + '=-((' + ea + ')&(' + sizeMask + '))&(' + sizeMask + ');'; },
                function (ea) {
                    if (sizeBytes === 1) return 'c.s8(' + ea + ',-c.l8(' + ea + ')&0xff);';
                    if (sizeBytes === 2) return 'c.s16(' + ea + ',-c.l16(' + ea + ')&0xffff);';
                    return 'c.s32(' + ea + ',-c.l32(' + ea + '));';
                },
                sizeBytes
            );
            return {
                'code': [ea.code],
                'out': {
                    'n': '((' + ea + ')&' + (size===0?'0x80':size===1?'0x8000':'0x80000000') + ')',
                    'z': '((' + ea + ')==0)',
                    'v': '0', 'c': '0'
                },
                'pc': ea.pc
            };
        }
        
        // Check for NEGX (01000000size00xxxx)
        if (op === 0 && r === 1) {
            // Simplified - doesn't handle X flag properly
            this.log('NEGX simplified');
            var size = (inst >> 6) & 3;
            var sizeBytes = size === 0 ? 1 : size === 1 ? 2 : 4;
            return {
                'code': ['// NEGX not fully implemented'],
                'pc': pc + 2
            };
        }
        
        // Check for TST (01001010size00xxxx)
        if (op === 2 && r === 1) {
            var size = (inst >> 6) & 3;
            var sizeBytes = size === 0 ? 1 : size === 1 ? 2 : 4;
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return 'var t=' + ea + ';'; },
                function (ea) {
                    if (sizeBytes === 1) return 'var t=c.l8(' + ea + ')&0xff;';
                    if (sizeBytes === 2) return 'var t=c.l16(' + ea + ')&0xffff;';
                    return 'var t=c.l32(' + ea + ');';
                },
                sizeBytes
            );
            return {
                'code': [ea.code],
                'out': {
                    'n': '(t>>31)',
                    'z': '(t==0)',
                    'v': '0', 'c': '0'
                },
                'pc': ea.pc
            };
        }
        
        // Check for TAS (0100101011xxxxxx)
        if (op === 2 && r === 3) {
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return 'var t=' + ea + ';c.cz=(t==0);c.cn=(t>>7)&1;' + ea + '|=0x80;'; },
                function (ea) { return 'var t=c.l8(' + ea + ');c.cz=(t==0);c.cn=(t>>7)&1;c.s8(' + ea + ',t|0x80);'; },
                1
            );
            return {
                'code': [ea.code],
                'out': { 'n': 'c.cn', 'z': 'c.cz', 'v': '0', 'c': '0' },
                'pc': ea.pc
            };
        }
        
        // Check for EXT.W (0100100010000xxx)
        if (op === 0 && r === 2 && (inst & 0x38) === 0) {
            return {
                'code': ['c.d[' + reg + ']=this.xw(c.d[' + reg + ']&0xff);'],
                'out': this.flagMove('c.d[' + reg + ']'),
                'pc': pc + 2
            };
        }
        
        // Check for EXT.L (0100100011000xxx)
        if (op === 0 && r === 2 && (inst & 0x38) === 8) {
            return {
                'code': ['c.d[' + reg + ']=this.xw(c.d[' + reg + ']&0xffff);'],
                'out': this.flagMove('c.d[' + reg + ']'),
                'pc': pc + 2
            };
        }
        
        // Check for SWAP (0100100001000xxx)
        if (op === 0 && r === 1 && (inst & 0x38) === 8) {
            return {
                'code': ['var t=c.d[' + reg + '];c.d[' + reg + ']=((t&0xffff)<<16)|((t>>16)&0xffff);'],
                'out': this.flagMove('c.d[' + reg + ']'),
                'pc': pc + 2
            };
        }
        
        // Check for LINK (0100111001010xxx)
        if ((inst & 0xfff8) === 0x4e50) {
            var disp = this.context.fetch(pc + 2);
            return {
                'code': ['c.a[7]-=4;c.s32(c.a[7],c.a[' + r + ']);c.a[' + r + ']=c.a[7];c.a[7]+=' + this.extS16U32(disp) + ';'],
                'pc': pc + 4
            };
        }
        
        // Check for UNLINK (0100111001011xxx)
        if ((inst & 0xfff8) === 0x4e58) {
            return {
                'code': ['c.a[7]=c.a[' + r + '];c.a[' + r + ']=c.l32(c.a[7]);c.a[7]+=4;'],
                'pc': pc + 2
            };
        }
        
        // Check for MOVE to SR (0100011011011000)
        if (inst === 0x46d8 || (op === 1 && r === 3 && mode === 2)) {
            return {
                'code': ['c.sr=c.l16(c.a[7]);c.a[7]+=2;c.syncSr();'],
                'pc': pc + 2
            };
        }
        
        // Check for MOVE from SR (0100000011000xxx)
        if (op === 0 && r === 3 && mode === 0) {
            return {
                'code': ['c.d[' + reg + ']=c.sr&0xffff;'],
                'pc': pc + 2
            };
        }
        
        // Check for MOVE to USP (0100111000000xxx)
        if ((inst & 0xfff8) === 0x4e60) {
            return { 'code': ['c.usp=c.a[' + r + '];'], 'pc': pc + 2 };
        }
        
        // Check for MOVE from USP (0100111000001xxx)
        if ((inst & 0xfff8) === 0x4e68) {
            return { 'code': ['c.a[' + r + ']=c.usp;'], 'pc': pc + 2 };
        }
        
        // Check for TRAP (010011100100xxxx)
        if ((inst & 0xfff0) === 0x4e40) {
            var vec = inst & 0xf;
            return {
                'code': ['c.f(' + (0xa000 + vec) + ');'],
                'pc': pc + 2,
                'quit': true
            };
        }
        
        // Check for TRAPV (0100111001110110)
        if (inst === 0x4e76) {
            return {
                'code': ['if(c.cv){c.f(0x1c);}'],
                'pc': pc + 2
            };
        }
        
        // Check for CHK (0100xxxx10000xxx)
        if ((inst & 0xff00) === 0x4180) {
            // Simplified - full implementation needs bounds check
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return ''; },
                function (ea) { return ''; },
                2
            );
            return {
                'code': ['// CHK D' + r + ' bounds'],
                'pc': ea.pc
            };
        }
        
        // Check for MOVEM (0100100011xxxxxx or 0100110011xxxxxx)
        if ((inst & 0xff80) === 0x4880 || (inst & 0xff80) === 0x4c80) {
            var regMask = this.context.fetch(pc + 2);
            return {
                'code': ['// MOVEM regMask=' + regMask.toString(16)],
                'pc': pc + 4
            };
        }
        
        // Check for NBCD (01001000000xxxxx)
        if ((inst & 0xffc0) === 0x4800) {
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return '// NBCD ' + ea; },
                function (ea) { return '// NBCD ' + ea; },
                1
            );
            return {
                'code': [ea.code],
                'pc': ea.pc
            };
        }
        
        // Check for ABCD (0100xxxx100xxxxx) - op=1, r=4
        if (op === 1 && r === 4) {
            var rm = (inst >> 3) & 1;
            if (rm === 0) {
                // ABCD Dn, Dn
                return {
                    'code': ['// ABCD D' + reg + ',D' + r + ' (BCD add not implemented)'],
                    'pc': pc + 2
                };
            } else {
                // ABCD -(An), -(An)
                return {
                    'code': ['// ABCD -(A' + reg + '),-(A' + r + ') (BCD add not implemented)'],
                    'pc': pc + 2
                };
            }
        }
        
        // Check for SBCD (1000xxxx100xxxxx) - handled in decode8
        
        // Check for JMP (01001110101xxxxx)
        if ((inst & 0xffc0) === 0x4ec0) {
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return 'c.pc=' + ea + ';'; },
                function (ea) { return 'c.pc=' + ea + ';'; },
                4
            );
            return { 'code': [ea.code], 'pc': pc + 2, 'quit': true };
        }
        
        // Check for JSR (01001110100xxxxx)
        if ((inst & 0xffc0) === 0x4e80) {
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return ''; },
                function (ea) { return ''; },
                4
            );
            return {
                'code': ['c.a[7]-=4;c.s32(c.a[7],' + (pc + 2) + ');' + ea.code],
                'pc': pc + 2,
                'quit': true
            };
        }
        
        // Default: not implemented
        this.log('not impl: line=4, op=' + op + ', r=' + r + ', mode=' + mode + ', inst=' + inst.toString(16));
        throw console.assert(false);
    };
