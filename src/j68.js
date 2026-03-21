exports.j68 = (function () {
    var Context = function (memorySize) {
        this.d = new Uint32Array(8);  // Data registers.
        this.a = new Uint32Array(8);  // Address registers.
        this.pc = 0;  // Program counter.
        this.i = 0;  // Instruction counts.
        this.cx = 0;  // Condition code X.
        this.cn = 0;  // Condition code N.
        this.cz = 0;  // Condition code Z.
        this.cv = 0;  // Condition code V.
        this.cc = 0;  // Condition code C.
        this.sr = 0;  // Status register.
        this.m = new DataView(new ArrayBuffer(memorySize));  // Memory image.
        this.c = {};  // Code cache.

        this.halt = false;
        this.t = new Uint32Array(1);  // Work.

        // TODO: Check memory alignments, do cache invalidation.
        this.l8 = function (address) { return this.m.getUint8(address); };
        this.l16 = function (address) { return this.m.getUint16(address); };
        this.l32 = function (address) { return this.m.getUint32(address); };
        this.fetch = function (address) { return this.m.getUint16(address); };

        // Returns false if the running code is modified.
        this.s8 = function (address, data) { this.m.setUint8(address, data); return true; };
        this.s16 = function (address, data) { this.m.setUint8(address, data); return true; };
        this.s32 = function (address, data) { this.m.setUint32(address, data); return true; };

        // F-line emulation hook.        
        this.f = function (inst) {};

        Object.seal(this);
    };
    
    Context.prototype.syncSr = function () {
        this.sr &= 0xff00;
        if (this.cx) this.sr |= 0x10;
        if (this.cn) this.sr |= 0x08;
        if (this.cz) this.sr |= 0x04;
        if (this.cv) this.sr |= 0x02;
        if (this.cc) this.sr |= 0x01;
    };
    
    Context.prototype.setCcr = function (ccr) {
        this.sr = (this.sr & 0xff00) | (ccr & 0x1f);
    };
    
    Context.prototype.xw = function (s16) {
        if (s16 < 0x8000)
            return s16;
        return 0xffff0000 + s16;
    };

    Context.prototype.divs = function (src, dst) {
        // TODO: zero div trap.
        var s16 = this.xw(src & 0xffff);
        var d32 = dst & 0xffffffff;
        if (s16 == 0xffff && d32 == 0x80000000) {
            this.t[0] = 0x00;
            return 0;
        }
        var q = (d32 / s16)|0;
        var q16 = q & 0xffff;
        if (q != this.xw(q16)) {
            this.t[0] = 0x02;
            return d32;
        }
        var r = d32 % s16;
        this.t[0] = 0;
        if (q === 0) this.t[0] |= 0x04;
        else if (q & 0x8000) this.t[0] |= 0x08;
        return q16 + (r << 16);
    };

    var toHex = function (n, l) {
        var size = l || 8;
        return ('0000000' + n.toString(16)).substr(-size);
    };
    
    var j68 = function () {
        // 1MB RAM (0000_0000 - 000f_ffff)
        this.context = new Context(1024 * 1024);
        
        this.type = j68.TYPE_MC68000;
        
        this.logJit = false;
        this.logOpt = false;
        this.logDecode = false;
    };
    
    j68.TYPE_MC68000 = 0;
    j68.TYPE_MC68020 = 2;
    j68.TYPE_MC68030 = 3;
    j68.TYPE_MC68040 = 4;
    
    j68.prototype.log = function (message) {
        console.log('j68: ' + message);
    };
    
    j68.prototype.extS8U32 = function (s8) {
        if (s8 < 0x80)
            return s8;
        return 0xffffff00 + s8;
    };
    
    j68.prototype.extS16U32 = function (s16) {
        return this.context.xw(s16);
    };
    
    j68.prototype.addU32S8 = function (u32, s8) {
        return u32 + this.extS8U32(s8);
    };

    j68.prototype.addU32S16 = function (u32, s16) {
        return u32 + this.extS16U32(s16);
    };
    
    j68.prototype.effectiveAddress = function (pc, inst, regop, memop, size) {
        // TODO: Check supporting addressing mode for each operation.
        var mode = (inst >> 3) & 7;
        var r = inst & 7;
        var ea;
        var disp;
        switch (mode) {
            case 0:
                ea = 'c.d[' + r + ']';
                return {
                    'code': regop(ea),
                    'pc': pc + 2
                };
            case 1:
                ea = 'c.a[' + r + ']';
                return {
                    'code': regop(ea),
                    'pc': pc + 2
                };
            case 2:
                ea = 'c.a[' + r + ']';
                return {
                    'code': memop(ea),
                    'pc': pc + 2
                };
            case 3:
                ea = 'c.a[' + r + ']';
                return {
                    'code': memop(ea) + ea + '+=' + size + ';',
                    'pc': pc + 2
                };
            case 4:
                ea = 'c.a[' + r + ']';
                return {
                    'code': ea + '-=' + size + ';' + memop(ea),
                    'pc': pc + 2
                };
            case 5:
                disp = this.context.fetch(pc + 2);
                ea = 'c.a[' + r + ']+' + this.extS16U32(disp);
                return {
                    'code': memop(ea),
                    'pc': pc + 4
                };
            case 6:
                disp = this.context.fetch(pc + 2);
                // TODO: Support full format extended word for 20, 30, and 40.
                if (disp & 0x0100)
                    throw console.assert(false);
                var regName = ((disp & 0x8000) ? 'c.a[' : 'c.d[') + ((disp >> 12) & 7) + ']';
                if (0 === (disp & 0x0800))
                    regName = 'this.xw(' + regName + '&0xffff)';
                var scale = (disp >> 9) & 3;
                if (scale !== 0)
                    regName = '(' + regName + [ '<<1)', '<<2)', '<<3)' ][scale - 1];
                ea = 'c.a[' + r + ']+' + regName + '+' + this.extS8U32(disp & 0xff);
                return {
                    'code': memop(ea),
                    'pc': pc + 4
                };
            case 7:
                switch (r) {
                    case 2:
                        disp = this.context.fetch(pc + 2);
                        ea = '' + this.addU32S16(pc + 2, disp);
                        return {
                            'code': memop(ea),
                            'pc': pc + 4
                        };
                    case 4:
                        ea = this.extS16U32(this.context.fetch(pc + 2));
                        return {
                            'code': regop(ea),
                            'pc': pc + 4
                        }
                }
                this.log('not impl ea mode 7 r: ' + r);
                throw console.assert(false);
        }
        // TODO: Implement other mode
        this.log('not impl ea mode: ' + mode);
        throw console.assert(false);
    };
    
    j68.prototype.run = function () {
        var c = this.context;
        for (;;) {
            if (c.halt) break;
            var pc = c.pc;
            if (!c.c[pc])
                c.c[pc] = this.compile();
            c.c[pc](c);
        }
    };
    
    j68.prototype.compile = function () {
        if (this.logJit) {
            this.log('bynary translation; pc=$' + toHex(this.context.pc));
            console.time('compile');
        }
        
        // Binary code generations.
        var pc = this.context.pc;
        var asm = [];
        var i = 0;
        for (;;) {
            var code = this.decode(pc);
            asm.push(code);
            pc = code.pc;
            i++;
            if (code.quit) {
                if (!code.in || !code.in.pc)
                    asm.push({ 'code': ['c.pc=' + pc + ';' ] });
                asm.push({ 'code': ['c.i+=' + i + ';' ] });
                if (code.error) {
                    this.context.halt = true;
                    this.log('compile error: ' + code.message);
                }
                break;
            }
        }
        
        // Optimize generated codes.
        var opt = [];
        var asmLength = asm.length;

        // 1. Eliminate unused condition calculations.
        var flags = [ 'x', 'n', 'z', 'v', 'c' ];
        for (i = 0; i < asmLength; ++i) {
            asm[i].post = [];
            if (!asm[i].out)
                continue;
            for (var type = 0; type < flags.length; ++type) {
                var flag = flags[type];
                if (!asm[i].out[flag])
                    continue;
                for (var j = i + 1; j < asmLength; ++j) {
                    if (asm[j].in && asm[j].in[flag])
                        break;
                    if (asm[j].out && asm[j].out[flag]) {
                        asm[i].out[flag] = null;
                        break;
                    }
                }
                if (asm[i].out[flag]) {
                    asm[i].post.push('c.c' + flag + '=' + asm[i].out[flag] + ';');
                }
            }
        }
        
        // 2. Insert PC/SR update.
        for (i = asmLength - 1; i > 0; --i) {
            if (!asm[i].in)
                continue;
            if (asm[i].in.pc)
                asm[i - 1].post.push('c.pc=' + asm[i].pc + ';');
            if (asm[i].in.sr)
                asm[i - 1].post.push('c.syncSr();');
        }
        for (i = 0; i < asmLength; ++i) {
            if (asm[i].code)
                opt.push(asm[i].code.join(''));
            if (asm[i].post)
                opt.push(asm[i].post.join(''));
        }
        
        // 3. Final code generation.
        var optCode = opt.join('');
        var func = new Function('c', optCode);
        if (this.logJit) {
            console.timeEnd('compile');
            if (this.logOpt)
                this.log(JSON.stringify(asm));
            this.log(func);
            if (optCode.indexOf(';;') >= 0)
                throw console.assert(false, 'unexpected code sequence: ' + optCode);
        }
        return func;
    };
    
    j68.prototype.decode = function (pc) {
        var inst = this.context.fetch(pc);
        if (this.logDecode)
            this.log('decode; $' + toHex(pc) + ': ' + toHex(inst, 4));
        var line = (inst >> 12) & 0xf;
        switch (line) {
            case 0x0: return this.decode0(pc, inst);
            case 0x1: return this.decode1(pc, inst);
            case 0x3: return this.decode3(pc, inst);
            case 0xA: return this.decodeA(pc, inst);
            case 0xB: return this.decodeB(pc, inst);
            case 0xC: return this.decodeC(pc, inst);
            case 0xE: return this.decodeE(pc, inst);
            case 0x2:  // MOVEL, MOVEAL
                return this.decode2(pc, inst);
            case 0x4:  // LEA
                return this.decode4(pc, inst);
            case 0x5:  // ADDQ
                return this.decode5(pc, inst);
            case 0x6:  // BRA / BSR / Bcc (TODO: Test)
                return this.decode6(pc, inst);
            case 0x7:  // MOVEQ (TODO: unused bit check)
                return this.decode7(pc, inst);
            case 0x8:  // ...
                return this.decode8(pc, inst);
            case 0x9:  // SUB
                return this.decode9(pc, inst);
            case 0xd:  // ADDX, ADDA, ADD
                return this.decodeD(pc, inst);
            case 0xf:  // F-line
                return this.decodeF(pc, inst);
        }
        // TODO: Implement other operations.
        throw console.assert(false);
    };
    
    j68.prototype.decode2 = function (pc, inst) {
        // MOVEL, MOVEAL
        var r = (inst >> 9) & 7;
        var mode = (inst >> 6) & 7;
        var ea;
        switch (mode) {
            case 0:
                // MOVEL *,dx
                ea = this.effectiveAddress(
                        pc, inst,
                        function (ea) { return 'c.d[' + r + ']=' + ea + ';'; },
                        function (ea) { return 'c.d[' + r + ']=c.l32(' + ea + ');'; },
                        4);
                return {
                    'code': [ ea.code ],
                    'out': this.flagMove('c.d[' + r + ']'),
                    'pc': ea.pc
                };
            case 1:
                // MOVEAL
                ea = this.effectiveAddress(
                        pc, inst,
                        function (ea) { return 'c.a[' + r + ']=' + ea + ';'; },
                        function (ea) { return 'c.a[' + r + ']=c.l32(' + ea + ');'; },
                        4);
                return {
                    'code': [ ea.code ],
                    'pc': ea.pc
                };
        }
        // TODO: Implement other modes.
        this.log('not impl movel mode: ' + mode);
        throw console.assert(false);
    };
    
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
    j68.prototype.decode5 = function (pc, inst) {
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
    }
    
    j68.prototype.decode6 = function (pc, inst) {
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
    };

    j68.prototype.decode7 = function (pc, inst) {
        // MOVEQ
        var r = (inst >> 9) & 0x7;
        var zero = (inst >> 8) & 1;
        var data = inst & 0xff;
        if (zero) {
            // TODO: Unknown instruction.
            throw console.assert(false);
        }
        return {
            'code': [ 'c.d[' + r + ']=' + this.extS8U32(data) + ';' ],
            'out': this.flagMove('c.d[' + r + ']'),
            'pc': pc + 2
        };
    };
    
    j68.prototype.decode8 = function (pc, inst) {
        var r = (inst >> 9) & 7;
        var opmode = (inst >> 6) & 7;
        var code = [];
        var ea;
        var out;
        switch (opmode) {
            case 7:  // DIVS
                ea = this.effectiveAddress(
                        pc, inst,
                        function (ea) { return 'c.d[' + r + ']=c.divs(' + ea + ',' + 'c.d[' + r + ']);'; },
                        function (ea) { return 'c.d[' + r + ']=c.divs(c.l16(' + ea + '),' + 'c.d[' + r + ']);'; },
                        2);
                code.push(ea.code);
                out = {
                    'n': 'c.t[0]&8',
                    'z': 'c.t[0]&4',
                    'v': 'c.t[0]&2',
                    'c': false
                };
                break;
            default:
                // TODO: Implement.
                this.log('line 9 not impl opmode: ' + opmode);
                throw console.assert(false);
        }
        return {
            'code': code,
            'out': out,
            'pc': ea.pc
        };
    };

    j68.prototype.decode9 = function (pc, inst) {
        // SUB, SUBA
        var r = (inst >> 9) & 7;
        var opmode = (inst >> 6) & 7;
        var code = [];
        var ea;
        switch (opmode) {
            case 7:  // SUBAL
                ea = this.effectiveAddress(
                        pc, inst, 
                        function (ea) { return 'c.a[' + r + ']-=' + ea + ';'; },
                        function (ea) { return 'c.a[' + r + ']-=c.l32(' + ea + ');'; },
                        4);
                code.push(ea.code);
                break;
            default:
                // TODO: Implement other opmode.
                // SUB will need condition update.
                this.log('sub not impl opmode: ' + opmode);
                throw console.assert(false);
        }
        return {
            'code': code,
            'pc': ea.pc
        };
    };
    
    j68.prototype.decodeD = function (pc, inst) {
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
                var dstReg = r;  // Destination is in bits 9-11
                var srcReg = (inst >> 0) & 7;  // Source is in bits 0-2 for Dn mode
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
    };

    j68.prototype.decodeF = function (pc, inst) {
        // F-line
        return {
            'in': {
                'pc': true,
                'x': true,
                'n': true,
                'z': true,
                'v': true,
                'c': true,
                'sr': true
            },
            'code': [ 'c.f(' + inst + ');' ],
            'pc': pc + 2,
            'quit': true
        };
    };
    
    j68.prototype.flagMove = function (r) {
        return {
            'n': '(' + r + '>>31)',
            'z': '(' + r + '==0)',
            'v': '0',
            'c': '0'
        };
    };
    

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
        // ABCD (opmode 4)
        if (opmode === 4) {
            return { 'code': ['/* ABCD */'], 'pc': pc + 2 };
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

    return j68;
})();
