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
        this.sfc = 0;
        this.dfc = 0;
        this.vbr = 0;
        this.cacr = 0;
        this.caar = 0;
        this.msp = 0;
        this.isp = 0;
        this.tc = 0;
        this.mmusr = 0;
        this.a[7] = memorySize >>> 0;  // Initialize SP to top of RAM.
        this.usp = this.a[7];
        this.ssp = this.a[7];
        this.msp = this.a[7];
        this.isp = this.a[7];

        this.halt = false;
        this.t = new Uint32Array(1);  // Work.

        // TODO: Check memory alignments, do cache invalidation.
        this.l8 = function (address) { return this.m.getUint8(address); };
        this.l16 = function (address) { return this.m.getUint16(address); };
        this.l32 = function (address) { return this.m.getUint32(address); };
        this.fetch = function (address) { return this.m.getUint16(address); };

        // Returns false if the running code is modified.
        this.s8 = function (address, data) { this.m.setUint8(address, data); return true; };
        this.s16 = function (address, data) { this.m.setUint16(address, data); return true; };
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
        this.sr = (this.sr & 0xffe0) | (ccr & 0x1f);
        this.cx = 0 !== (ccr & 0x10);
        this.cn = 0 !== (ccr & 0x08);
        this.cz = 0 !== (ccr & 0x04);
        this.cv = 0 !== (ccr & 0x02);
        this.cc = 0 !== (ccr & 0x01);
    };

    Context.prototype.setSr = function (sr) {
        var oldS = this.sr & 0x2000;
        var newS = sr & 0x2000;
        if (oldS !== newS) {
            if (newS) {
                this.usp = this.a[7] >>> 0;
                this.a[7] = this.ssp >>> 0;
            } else {
                this.ssp = this.a[7] >>> 0;
                this.a[7] = this.usp >>> 0;
            }
        }
        this.sr = sr & 0xffff;
        this.cx = 0 !== (this.sr & 0x10);
        this.cn = 0 !== (this.sr & 0x08);
        this.cz = 0 !== (this.sr & 0x04);
        this.cv = 0 !== (this.sr & 0x02);
        this.cc = 0 !== (this.sr & 0x01);
    };

    Context.prototype.exception = function (vector, framePc) {
        this.syncSr();
        var oldSr = this.sr & 0xffff;
        if (0 === (oldSr & 0x2000)) {
            this.usp = this.a[7] >>> 0;
            this.a[7] = this.ssp >>> 0;
        }
        this.sr = oldSr | 0x2000;
        this.a[7] = (this.a[7] - 6) >>> 0;
        this.s16(this.a[7], oldSr);
        this.s32(this.a[7] + 2, (framePc === undefined ? this.pc : framePc) >>> 0);
        this.ssp = this.a[7] >>> 0;
        this.pc = this.l32(vector << 2) >>> 0;
    };

    Context.prototype.bitFieldReadMem = function (base, offset, width) {
        var value = 0 >>> 0;
        for (var i = 0; i < width; ++i) {
            var bitIndex = offset + i;
            var byteOffset = Math.floor(bitIndex / 8);
            var bitInByte = bitIndex - (byteOffset * 8);
            var byteValue = this.l8((base + byteOffset) >>> 0);
            value = ((value << 1) | ((byteValue >> (7 - bitInByte)) & 1)) >>> 0;
        }
        return value >>> 0;
    };

    Context.prototype.bitFieldWriteMem = function (base, offset, width, value) {
        for (var i = 0; i < width; ++i) {
            var bitIndex = offset + i;
            var byteOffset = Math.floor(bitIndex / 8);
            var bitInByte = bitIndex - (byteOffset * 8);
            var address = (base + byteOffset) >>> 0;
            var byteValue = this.l8(address);
            var srcBit = (value >>> (width - 1 - i)) & 1;
            var mask = 1 << (7 - bitInByte);
            if (srcBit)
                byteValue |= mask;
            else
                byteValue &= ~mask;
            this.s8(address, byteValue);
        }
    };

    Context.prototype.bitFieldReadReg = function (value, offset, width) {
        var field = 0 >>> 0;
        for (var i = 0; i < width; ++i) {
            var regBit = (offset + i) & 31;
            field = ((field << 1) | ((value >>> (31 - regBit)) & 1)) >>> 0;
        }
        return field >>> 0;
    };

    Context.prototype.bitFieldWriteReg = function (value, offset, width, field) {
        var result = value >>> 0;
        for (var i = 0; i < width; ++i) {
            var regBit = (offset + i) & 31;
            var srcBit = (field >>> (width - 1 - i)) & 1;
            var mask = (1 << (31 - regBit)) >>> 0;
            if (srcBit)
                result = (result | mask) >>> 0;
            else
                result = (result & (~mask >>> 0)) >>> 0;
        }
        return result >>> 0;
    };

    Context.prototype.bitFieldWidth = function (rawWidth) {
        rawWidth &= 31;
        return rawWidth === 0 ? 32 : rawWidth;
    };

    Context.prototype.bitFieldSignExtend = function (value, width) {
        if (width === 32)
            return value >>> 0;
        var signBit = 1 << (width - 1);
        var mask = (1 << width) - 1;
        value &= mask;
        if (value & signBit)
            return (value | (~mask)) >>> 0;
        return value >>> 0;
    };

    Context.prototype.bitFieldInsertValue = function (value, width) {
        if (width === 32)
            return value >>> 0;
        var mask = (1 << width) - 1;
        return (value & mask) >>> 0;
    };

    Context.prototype.bitFieldFindFirstOne = function (value, width) {
        for (var i = 0; i < width; ++i) {
            if ((value >>> (width - 1 - i)) & 1)
                return i;
        }
        return width;
    };

    Context.prototype.move16 = function (src, dst) {
        var srcBase = src & ~15;
        var dstBase = dst & ~15;
        var srcIndex = (src >>> 2) & 3;
        var dstIndex = (dst >>> 2) & 3;
        var line = [
            this.l32(srcBase + (((srcIndex + 0) & 3) << 2)) >>> 0,
            this.l32(srcBase + (((srcIndex + 1) & 3) << 2)) >>> 0,
            this.l32(srcBase + (((srcIndex + 2) & 3) << 2)) >>> 0,
            this.l32(srcBase + (((srcIndex + 3) & 3) << 2)) >>> 0
        ];
        this.s32(dstBase + (((dstIndex + 0) & 3) << 2), line[0]);
        this.s32(dstBase + (((dstIndex + 1) & 3) << 2), line[1]);
        this.s32(dstBase + (((dstIndex + 2) & 3) << 2), line[2]);
        this.s32(dstBase + (((dstIndex + 3) & 3) << 2), line[3]);
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

    Context.prototype.divu = function (src, dst) {
        // TODO: zero div trap.
        var u16 = src & 0xffff;
        var d32 = dst >>> 0;
        var q = (d32 / u16) >>> 0;
        if (q > 0xffff) {
            this.t[0] = 0x02;
            return d32;
        }
        var r = d32 % u16;
        this.t[0] = 0;
        if (q === 0) this.t[0] |= 0x04;
        else if (q & 0x8000) this.t[0] |= 0x08;
        return ((r & 0xffff) << 16) | (q & 0xffff);
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
        return (u32 + this.extS8U32(s8)) >>> 0;
    };

    j68.prototype.addU32S16 = function (u32, s16) {
        return (u32 + this.extS16U32(s16)) >>> 0;
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
                    regName = 'c.xw(' + regName + '&0xffff)';
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
                        if (size === 1) {
                            ea = this.context.fetch(pc + 2) & 0xff;
                            return {
                                'code': regop(ea),
                                'pc': pc + 4
                            };
                        }
                        if (size === 2) {
                            ea = this.context.fetch(pc + 2);
                            return {
                                'code': regop(ea),
                                'pc': pc + 4
                            };
                        }
                        ea = this.context.l32(pc + 2) >>> 0;
                        return {
                            'code': regop(ea),
                            'pc': pc + 6
                        }
                }
                this.log('not impl ea mode 7 r: ' + r);
                throw console.assert(false);
        }
        // TODO: Implement other mode
        this.log('not impl ea mode: ' + mode);
        throw console.assert(false);
    };

    j68.prototype.effectiveAddressDst = function (pc, mode, r, regop, memop, size) {
        var ea;
        var disp;
        switch (mode) {
            case 0:
                ea = 'c.d[' + r + ']';
                return {
                    'code': regop(ea),
                    'pc': pc
                };
            case 1:
                ea = 'c.a[' + r + ']';
                return {
                    'code': regop(ea),
                    'pc': pc
                };
            case 2:
                ea = 'c.a[' + r + ']';
                return {
                    'code': memop(ea),
                    'pc': pc
                };
            case 3:
                ea = 'c.a[' + r + ']';
                return {
                    'code': memop(ea) + ea + '+=' + size + ';',
                    'pc': pc
                };
            case 4:
                ea = 'c.a[' + r + ']';
                return {
                    'code': ea + '-=' + size + ';' + memop(ea),
                    'pc': pc
                };
            case 5:
                disp = this.context.fetch(pc);
                ea = 'c.a[' + r + ']+' + this.extS16U32(disp);
                return {
                    'code': memop(ea),
                    'pc': pc + 2
                };
            case 6:
                disp = this.context.fetch(pc);
                if (disp & 0x0100)
                    throw console.assert(false);
                var regName = ((disp & 0x8000) ? 'c.a[' : 'c.d[') + ((disp >> 12) & 7) + ']';
                if (0 === (disp & 0x0800))
                    regName = 'c.xw(' + regName + '&0xffff)';
                var scale = (disp >> 9) & 3;
                if (scale !== 0)
                    regName = '(' + regName + [ '<<1)', '<<2)', '<<3)' ][scale - 1];
                ea = 'c.a[' + r + ']+' + regName + '+' + this.extS8U32(disp & 0xff);
                return {
                    'code': memop(ea),
                    'pc': pc + 2
                };
            case 7:
                switch (r) {
                    case 0:
                        ea = this.extS16U32(this.context.fetch(pc));
                        return {
                            'code': memop(ea),
                            'pc': pc + 2
                        };
                    case 1:
                        ea = this.context.l32(pc) >>> 0;
                        return {
                            'code': memop(ea),
                            'pc': pc + 4
                        };
                }
                this.log('not impl dst ea mode 7 r: ' + r);
                throw console.assert(false);
        }
        this.log('not impl dst ea mode: ' + mode);
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
            asm[i].pre = [];
            asm[i].post = [];
            if (!asm[i].out)
                continue;
            for (var type = 0; type < flags.length; ++type) {
                var flag = flags[type];
                if (!asm[i].out[flag])
                    continue;
                for (var j = i + 1; j < asmLength; ++j) {
                    if (asm[j].in && (asm[j].in[flag] || (asm[j].in.sr && flag !== 'sr')))
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
        for (i = asmLength - 1; i >= 0; --i) {
            if (!asm[i].in)
                continue;
            if (asm[i].in.pc) {
                if (i > 0) asm[i - 1].post.push('c.pc=' + asm[i].pc + ';');
                else asm[i].pre.push('c.pc=' + asm[i].pc + ';');
            }
            if (asm[i].in.sr) {
                if (i > 0) asm[i - 1].post.push('c.syncSr();');
                else asm[i].pre.push('c.syncSr();');
            }
        }
        for (i = 0; i < asmLength; ++i) {
            if (asm[i].pre)
                opt.push(asm[i].pre.join(''));
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
        var src = this.effectiveAddress(
                pc, inst,
                function (ea) { return 'var src=(' + ea + ')>>>0;'; },
                function (ea) { return 'var src=c.l32(' + ea + ');'; },
                4);

        if (mode === 1) {
            return {
                'code': [ src.code, 'c.a[' + r + ']=src>>>0;' ],
                'pc': src.pc
            };
        }

        var dst = this.effectiveAddressDst(
                src.pc, mode, r,
                function (ea) { return ea + '=src>>>0;'; },
                function (ea) { return 'c.s32(' + ea + ',src>>>0);'; },
                4);
        return {
            'code': [ src.code, dst.code ],
            'out': this.flagMove('src'),
            'pc': dst.pc
        };
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
                'in': { 'pc': true },
                'code': ['var ccr=c.l16(c.a[7]);c.a[7]+=2;c.setCcr(ccr&0xff);c.pc=c.l32(c.a[7]);c.a[7]+=4;'],
                'pc': pc + 2,
                'quit': true
            };
        }
        
        // Check for RTE (0100111001110011)
        if (inst === 0x4e73) {
            return {
                'in': { 'pc': true, 'sr': true },
                'code': ['if((c.sr&0x2000)===0){c.exception(8,' + pc + ');}else{c.setSr(c.l16(c.a[7]));c.a[7]+=2;c.pc=c.l32(c.a[7]);c.a[7]+=4;}'],
                'pc': pc + 2,
                'quit': true
            };
        }

        // Check for RTD (0100111001110100)
        if (inst === 0x4e74) {
            var rtdDisp = this.context.fetch(pc + 2);
            return {
                'in': { 'pc': true },
                'code': ['c.pc=c.l32(c.a[7]);c.a[7]=(c.a[7]+4+' + this.extS16U32(rtdDisp) + ')>>>0;'],
                'pc': pc + 4,
                'quit': true
            };
        }
        
        // Check for RESET (0100111001110000)
        if (inst === 0x4e70) {
            return { 'code': ['/* RESET */'], 'pc': pc + 2 };
        }

        // Check for MOVEC (010011100111101a / 010011100111101b)
        if (inst === 0x4e7a || inst === 0x4e7b) {
            var movecExt = this.context.fetch(pc + 2);
            var movecIsAddr = (movecExt & 0x8000) !== 0;
            var movecReg = (movecExt >> 12) & 7;
            var movecCr = movecExt & 0x0fff;
            var movecRegRef = (movecIsAddr ? 'c.a[' : 'c.d[') + movecReg + ']';
            var movecRead = null;
            var movecWrite = null;
            switch (movecCr) {
                case 0x000: movecRead = '(c.sfc>>>0)'; movecWrite = 'c.sfc=(src&7);'; break;
                case 0x001: movecRead = '(c.dfc>>>0)'; movecWrite = 'c.dfc=(src&7);'; break;
                case 0x002: movecRead = '(c.cacr>>>0)'; movecWrite = 'c.cacr=(src>>>0);'; break;
                case 0x800: movecRead = '(c.usp>>>0)'; movecWrite = 'c.usp=(src>>>0);'; break;
                case 0x801: movecRead = '(c.vbr>>>0)'; movecWrite = 'c.vbr=(src>>>0);'; break;
                case 0x802: movecRead = '(c.caar>>>0)'; movecWrite = 'c.caar=(src>>>0);'; break;
                case 0x803: movecRead = '(c.msp>>>0)'; movecWrite = 'c.msp=(src>>>0);'; break;
                case 0x804: movecRead = '(c.isp>>>0)'; movecWrite = 'c.isp=(src>>>0);'; break;
            }
            if (movecRead === null) {
                return {
                    'in': { 'pc': true },
                    'code': [ 'c.exception(4,' + pc + ');' ],
                    'pc': pc + 4,
                    'quit': true
                };
            }
            if (inst === 0x4e7a) {
                return {
                    'in': { 'pc': true, 'sr': true },
                    'code': [
                        'if((c.sr&0x2000)===0){c.exception(8,' + pc + ');}else{' + movecRegRef + '=' + movecRead + ';}'
                    ],
                    'pc': pc + 4,
                    'quit': true
                };
            }
            return {
                'in': { 'pc': true, 'sr': true },
                'code': [
                    'if((c.sr&0x2000)===0){c.exception(8,' + pc + ');}else{var src=' + movecRegRef + '>>>0;' + movecWrite + '}'
                ],
                'pc': pc + 4,
                'quit': true
            };
        }
        
        // Check for STOP (0100111001110010)
        if (inst === 0x4e72) {
            var data = this.context.fetch(pc + 2);
            return {
                'in': { 'pc': true, 'sr': true },
                'code': ['if((c.sr&0x2000)===0){c.exception(8,' + pc + ');}else{c.setSr(' + data + ');c.pc=' + (pc + 4) + ';c.halt=true;}'],
                'pc': pc + 4,
                'quit': true
            };
        }

        // Check for ILLEGAL (0100101011111100)
        if (inst === 0x4afc) {
            return {
                'in': { 'pc': true },
                'code': ['c.f(0x10);'],
                'pc': pc + 2,
                'quit': true
            };
        }

        // Check for BKPT (0100100001001xxx) - treat as NOP on 68000 baseline
        if ((inst & 0xfff8) === 0x4848) {
            return { 'code': ['/* BKPT */'], 'pc': pc + 2 };
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
        
        // Check for PEA (0100100001mmmrrr), control addressing modes only
        if (op === 1 && r === 4 && mode >= 2) {
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
        
        // Check for CLR (01000010ssmmmrrr)
        if ((inst & 0xff00) === 0x4200) {
            var size = (inst >> 6) & 3;
            if (size === 3)
                size = -1;
            if (size !== -1) {
            var sizeBytes = size === 0 ? 1 : size === 1 ? 2 : 4;
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
        }
        
        // Check for NOT (01000110ssmmmrrr)
        if ((inst & 0xff00) === 0x4600) {
            var size = (inst >> 6) & 3;
            if (size === 3)
                size = -1;
            if (size !== -1) {
            var sizeBytes = size === 0 ? 1 : size === 1 ? 2 : 4;
            var sizeMask = size === 0 ? '0xff' : size === 1 ? '0xffff' : '0xffffffff';
            var highBit = size === 0 ? '0x80' : size === 1 ? '0x8000' : '0x80000000';
            var keepMask = size === 0 ? '0xffffff00' : size === 1 ? '0xffff0000' : '0x0';
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) {
                    if (sizeBytes === 4)
                        return 'var dst=(' + ea + ')&(' + sizeMask + ');var res=(~dst)&(' + sizeMask + ');' + ea + '=res>>>0;';
                    return 'var dst=(' + ea + ')&(' + sizeMask + ');var res=(~dst)&(' + sizeMask + ');' + ea + '=((' + ea + ')&' + keepMask + ')|res;';
                },
                function (ea) {
                    if (sizeBytes === 1) return 'var dst=c.l8(' + ea + ');var res=(~dst)&0xff;c.s8(' + ea + ',res);';
                    if (sizeBytes === 2) return 'var dst=c.l16(' + ea + ');var res=(~dst)&0xffff;c.s16(' + ea + ',res);';
                    return 'var dst=c.l32(' + ea + ');var res=(~dst)>>>0;c.s32(' + ea + ',res);';
                },
                sizeBytes
            );
            return {
                'code': [ea.code],
                'out': {
                    'n': '((res&' + highBit + ')!=0)',
                    'z': '(res==0)',
                    'v': '0', 'c': '0'
                },
                'pc': ea.pc
            };
            }
        }
        
        // Check for NEG (01000100ssmmmrrr)
        if ((inst & 0xff00) === 0x4400) {
            var size = (inst >> 6) & 3;
            if (size === 3)
                size = -1;
            if (size !== -1) {
            var sizeBytes = size === 0 ? 1 : size === 1 ? 2 : 4;
            var sizeMask = size === 0 ? '0xff' : size === 1 ? '0xffff' : '0xffffffff';
            var highBit = size === 0 ? '0x80' : size === 1 ? '0x8000' : '0x80000000';
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return 'var dst=(' + ea + ')&(' + sizeMask + ');var res=(-dst)&(' + sizeMask + ');' + ea + '=res;'; },
                function (ea) {
                    if (sizeBytes === 1) return 'var dst=c.l8(' + ea + ');var res=(-dst)&0xff;c.s8(' + ea + ',res);';
                    if (sizeBytes === 2) return 'var dst=c.l16(' + ea + ');var res=(-dst)&0xffff;c.s16(' + ea + ',res);';
                    return 'var dst=c.l32(' + ea + ');var res=(-dst)>>>0;c.s32(' + ea + ',res);';
                },
                sizeBytes
            );
            return {
                'code': [ea.code],
                'out': {
                    'x': '(dst!=0)',
                    'n': '((res&' + highBit + ')!=0)',
                    'z': '(res==0)',
                    'v': '(dst==' + highBit + ')',
                    'c': '(dst!=0)'
                },
                'pc': ea.pc
            };
            }
        }
        
        // Check for NEGX (01000000ssmmmrrr)
        if ((inst & 0xff00) === 0x4000) {
            var size = (inst >> 6) & 3;
            if (size !== 3) {
                var sizeBytes = size === 0 ? 1 : size === 1 ? 2 : 4;
                var sizeMask = size === 0 ? '0xff' : size === 1 ? '0xffff' : '0xffffffff';
                var highBit = size === 0 ? '0x80' : size === 1 ? '0x8000' : '0x80000000';
                var negxEa = this.effectiveAddress(
                    pc, inst,
                    function (ea) {
                        return 'var oldZ=c.cz;var dst=(' + ea + ')&' + sizeMask + ';var x=(c.cx?1:0);var srcx=(dst+x)&' + sizeMask + ';var ext=dst+x;var res=(0-ext)&' + sizeMask + ';' + ea + '=res;';
                    },
                    function (ea) {
                        if (sizeBytes === 1) return 'var oldZ=c.cz;var dst=c.l8(' + ea + ');var x=(c.cx?1:0);var srcx=(dst+x)&0xff;var ext=dst+x;var res=(0-ext)&0xff;c.s8(' + ea + ',res);';
                        if (sizeBytes === 2) return 'var oldZ=c.cz;var dst=c.l16(' + ea + ');var x=(c.cx?1:0);var srcx=(dst+x)&0xffff;var ext=dst+x;var res=(0-ext)&0xffff;c.s16(' + ea + ',res);';
                        return 'var oldZ=c.cz;var dst=c.l32(' + ea + ');var x=(c.cx?1:0);var srcx=(dst+x)>>>0;var ext=(dst>>>0)+x;var res=(0-ext)>>>0;c.s32(' + ea + ',res>>>0);';
                    },
                    sizeBytes
                );
                return {
                    'in': { 'x': true, 'z': true },
                    'code': [negxEa.code],
                    'out': {
                        'x': '(ext!==0)',
                        'n': '((res&' + highBit + ')!=0)',
                        'z': '(oldZ&&((res&' + sizeMask + ')==0))',
                        'v': '(((0&' + highBit + ')!=(srcx&' + highBit + '))&&((res&' + highBit + ')!=(0&' + highBit + ')))',
                        'c': '(ext!==0)'
                    },
                    'pc': negxEa.pc
                };
            }
        }
        
        // Check for TST (01001010ssmmmrrr)
        if ((inst & 0xff00) === 0x4a00) {
            var size = (inst >> 6) & 3;
            if (size === 3)
                size = -1;
            if (size !== -1) {
            var sizeBytes = size === 0 ? 1 : size === 1 ? 2 : 4;
            var sizeMask = size === 0 ? '0xff' : size === 1 ? '0xffff' : '0xffffffff';
            var highBit = size === 0 ? '0x80' : size === 1 ? '0x8000' : '0x80000000';
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return 'var t=(' + ea + ')&' + sizeMask + ';'; },
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
                    'n': '((t&' + highBit + ')!=0)',
                    'z': '(t==0)',
                    'v': '0', 'c': '0'
                },
                'pc': ea.pc
            };
            }
        }
        
        // Check for TAS (0100101011mmmrrr)
        if ((inst & 0xffc0) === 0x4ac0) {
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return 'var t=(' + ea + ')&0xff;c.cz=(t==0);c.cn=((t&0x80)!==0);' + ea + '=((' + ea + ')&0xffffff00)|(t|0x80);'; },
                function (ea) { return 'var t=c.l8(' + ea + ');c.cz=(t==0);c.cn=(t>>7)&1;c.s8(' + ea + ',t|0x80);'; },
                1
            );
            return {
                'code': [ea.code],
                'out': { 'n': 'c.cn', 'z': 'c.cz', 'v': '0', 'c': '0' },
                'pc': ea.pc
            };
        }
        
        // Check for EXT.W (0100100010000rrr)
        if ((inst & 0xfff8) === 0x4880) {
            return {
                'code': ['c.d[' + reg + ']=c.xw(c.d[' + reg + ']&0xff);'],
                'out': this.flagMove('c.d[' + reg + ']'),
                'pc': pc + 2
            };
        }
        
        // Check for EXT.L (0100100011000rrr)
        if ((inst & 0xfff8) === 0x48c0) {
            return {
                'code': ['c.d[' + reg + ']=c.xw(c.d[' + reg + ']&0xffff);'],
                'out': this.flagMove('c.d[' + reg + ']'),
                'pc': pc + 2
            };
        }
        
        // Check for SWAP (0100100001000xxx)
        if ((inst & 0xfff8) === 0x4840) {
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
                'code': ['c.setSr(c.l16(c.a[7]));c.a[7]+=2;'],
                'pc': pc + 2
            };
        }
        
        // Check for MOVE from SR (0100000011mmmrrr)
        if ((inst & 0xffc0) === 0x40c0) {
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return ea + '=(c.sr&0xffff);'; },
                function (ea) { return 'c.s16(' + ea + ',c.sr&0xffff);'; },
                2
            );
            return {
                'in': { 'sr': true },
                'code': [ea.code],
                'pc': ea.pc
            };
        }

        // Check for MOVE from CCR (0100001011mmmrrr)
        if ((inst & 0xffc0) === 0x42c0) {
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return ea + '=(c.sr&0x1f);'; },
                function (ea) { return 'c.s16(' + ea + ',c.sr&0x1f);'; },
                2
            );
            return {
                'in': { 'sr': true },
                'code': [ea.code],
                'pc': ea.pc
            };
        }

        // Check for MOVE to CCR (0100010011mmmrrr)
        if ((inst & 0xffc0) === 0x44c0) {
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return 'c.setCcr(' + ea + '&0xff);'; },
                function (ea) { return 'c.setCcr(c.l16(' + ea + ')&0xff);'; },
                2
            );
            return {
                'code': [ea.code],
                'pc': ea.pc
            };
        }

        // Check for MOVE to SR (0100011011mmmrrr)
        if ((inst & 0xffc0) === 0x46c0) {
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return 'c.setSr(' + ea + '&0xffff);'; },
                function (ea) { return 'c.setSr(c.l16(' + ea + '));'; },
                2
            );
            return {
                'code': [ea.code],
                'pc': ea.pc
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
                'in': { 'pc': true },
                'code': ['c.f(' + (0xa000 + vec) + ');'],
                'pc': pc + 2,
                'quit': true
            };
        }
        
        // Check for TRAPV (0100111001110110)
        if (inst === 0x4e76) {
            return {
                'in': { 'pc': true, 'v': true },
                'code': ['if(c.cv){c.f(0x1c);}'],
                'pc': pc + 2
            };
        }
        
        // Check for CHK (0100rrr110mmmxxx)
        if ((inst & 0xf1c0) === 0x4180) {
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return 'var upper=c.xw((' + ea + ')&0xffff);'; },
                function (ea) { return 'var upper=c.xw(c.l16(' + ea + '));'; },
                2
            );
            var chkCode = [];
            chkCode.push(ea.code);
            chkCode.push('var value=c.xw(c.d[' + r + ']&0xffff);');
            chkCode.push('c.cz=0;c.cv=0;c.cc=0;');
            chkCode.push('if(value<0){c.cn=1;c.exception(6,' + pc + ');}');
            chkCode.push('else if(value>upper){c.cn=0;c.exception(6,' + pc + ');}');
            return {
                'in': {
                    'pc': true,
                    'x': true,
                    'n': true
                },
                'code': chkCode,
                'pc': ea.pc,
                'quit': true
            };
        }
        
        // Check for MOVEM (0100100011xxxxxx or 0100110011xxxxxx), memory EA only
        if (((inst & 0xff80) === 0x4880 || (inst & 0xff80) === 0x4c80) && mode >= 2) {
            var regMask = this.context.fetch(pc + 2);
            return {
                'code': ['/* MOVEM regMask=' + regMask.toString(16) + ' */'],
                'pc': pc + 4
            };
        }
        
        // Check for NBCD (01001000000xxxxx)
        if ((inst & 0xffc0) === 0x4800) {
            ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return '/* NBCD ' + ea + ' */'; },
                function (ea) { return '/* NBCD ' + ea + ' */'; },
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
                    'code': ['/* ABCD D' + reg + ',D' + r + ' (BCD add not implemented) */'],
                    'pc': pc + 2
                };
            } else {
                // ABCD -(An), -(An)
                return {
                    'code': ['/* ABCD -(A' + reg + '),-(A' + r + ') (BCD add not implemented) */'],
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
        // ADDQ/SUBQ
        var data = (inst >> 9) & 7;
        if (data === 0) data = 8;  // 0 means 8
        var size = (inst >> 6) & 3;
        var mode = (inst >> 3) & 7;
        var r = inst & 7;
        var cond = (inst >> 8) & 0xf;

        var condCode = '';
        switch (cond) {
            case 0: condCode = 'true'; break;  // T
            case 1: condCode = 'false'; break;  // F
            case 2: condCode = '(!c.cc&&!c.cz)'; break;  // HI
            case 3: condCode = '(c.cc||c.cz)'; break;  // LS
            case 4: condCode = '!c.cc'; break;  // CC
            case 5: condCode = 'c.cc'; break;  // CS
            case 6: condCode = '!c.cz'; break;  // NE
            case 7: condCode = 'c.cz'; break;  // EQ
            case 8: condCode = '!c.cv'; break;  // VC
            case 9: condCode = 'c.cv'; break;  // VS
            case 10: condCode = '!c.cn'; break;  // PL
            case 11: condCode = 'c.cn'; break;  // MI
            case 12: condCode = '(c.cn===c.cv)'; break;  // GE
            case 13: condCode = '(c.cn!==c.cv)'; break;  // LT
            case 14: condCode = '(!c.cz&&(c.cn===c.cv))'; break;  // GT
            case 15: condCode = '(c.cz||(c.cn!==c.cv))'; break;  // LE
        }

        // TRAPcc (0101cccc11111ooo) - MC68020+
        if ((inst & 0x00f8) === 0x00f8 && (r === 2 || r === 3 || r === 4)) {
            if (this.type < j68.TYPE_MC68020) {
                return {
                    'code': [ 'c.exception(4,' + pc + ');' ],
                    'pc': pc + 2,
                    'quit': true
                };
            }
            var trapNextPc = pc + 2;
            if (r === 2) trapNextPc = pc + 4;
            else if (r === 3) trapNextPc = pc + 6;
            return {
                'in': { 'pc': true, 'n': true, 'z': true, 'v': true, 'c': true },
                'code': [ 'if(' + condCode + '){c.exception(7,' + trapNextPc + ');}else{c.pc=' + trapNextPc + ';}' ],
                'pc': trapNextPc,
                'quit': true
            };
        }
        
        var sizeMask = '0xffffffff';
        var highBit = '0x80000000';
        if (size === 0) { sizeMask = '0xff'; highBit = '0x80'; }
        else if (size === 1) { sizeMask = '0xffff'; highBit = '0x8000'; }
        
        // Check if SUBQ (bit 8 set in certain positions)
        var isSub = ((inst >> 8) & 1) === 1;

        // Scc (0101cccc11mmmrrr)
        if (size === 3 && mode !== 1) {
            var sccEa = this.effectiveAddress(
                    pc, inst,
                    function (dstEa) { return dstEa + '=((' + dstEa + ')&0xffffff00)|((' + condCode + ')?0xff:0x00);'; },
                    function (dstEa) { return 'c.s8(' + dstEa + ',(' + condCode + ')?0xff:0x00);'; },
                    1);
            return {
                'in': { 'n': true, 'z': true, 'v': true, 'c': true },
                'code': [ sccEa.code ],
                'pc': sccEa.pc
            };
        }

        // DBcc (0101cccc11001rrr)
        if (mode === 1 && size === 3) {
            var disp = this.context.fetch(pc + 2);
            var branchTarget = this.addU32S16(pc + 2, disp);
            var fallThrough = pc + 4;
            return {
                'in': { 'pc': true, 'n': true, 'z': true, 'v': true, 'c': true },
                'code': [
                    'if(!(' + condCode + ')){var counter=((c.d[' + r + ']-1)&0xffff);' +
                    'c.d[' + r + ']=(c.d[' + r + ']&0xffff0000)|counter;' +
                    'if(counter!==0xffff)c.pc=' + branchTarget + ';}'
                ],
                'pc': fallThrough,
                'quit': true
            };
        }
        
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
    }
    
    j68.prototype.decode6 = function (pc, inst) {
        var cond = (inst >> 8) & 0xf;
        var disp = inst & 0xff;
        var branchTarget = pc + 2;  // Default: next instruction
        var fallThrough = pc + 2;
        
        // Calculate branch target
        if (disp === 0) {
            // 16-bit disp
            var disp16 = this.context.fetch(pc + 2);
            branchTarget = this.addU32S16(pc + 2, disp16);
            fallThrough = pc + 4;
        } else if (disp == 0xff && this.type !== j68.TYPE_MC68000) {
            // 32-bit disp (68020+)
            var dispH = this.context.fetch(pc + 2);
            var dispL = this.context.fetch(pc + 4);
            branchTarget = (dispH << 16) | dispL;
            fallThrough = pc + 6;
        } else {
            // 8-bit disp
            branchTarget = this.addU32S8(pc + 2, disp);
            fallThrough = pc + 2;
        }
        
        if (cond === 0) {
            // BRA - always branch
            return { 'pc': branchTarget, 'quit': true };
        }
        
        if (cond === 1) {
            // BSR - branch to subroutine
            return {
                'code': ['c.a[7]-=4;c.s32(c.a[7],' + fallThrough + ');'],
                'pc': branchTarget,
                'quit': true
            };
        }
        
        // Bcc - conditional branch
        // Condition codes:
        // 2=HI, 3=LS, 4=MI, 5=PL, 6=NE, 7=EQ
        // 8=VC, 9=VS, 10=CC/HS, 11=CS/LO, 12=GE, 13=LT, 14=GT, 15=LE
        var condCode = '';
        switch (cond) {
            case 2: condCode = '(!c.cc&&!c.cz)'; break;  // HI (higher) = !C && !Z
            case 3: condCode = '(c.cc||c.cz)'; break;  // LS (lower or same) = C || Z
            case 4: condCode = 'c.cn'; break;  // MI (minus)
            case 5: condCode = '!c.cn'; break;  // PL (plus)
            case 6: condCode = '!c.cz'; break;  // NE (not equal)
            case 7: condCode = 'c.cz'; break;  // EQ (equal)
            case 8: condCode = '!c.cv'; break;  // VC (overflow clear)
            case 9: condCode = 'c.cv'; break;  // VS (overflow set)
            case 10: condCode = '!c.cc'; break;  // CC/HS (carry clear/higher or same)
            case 11: condCode = 'c.cc'; break;  // CS/LO (carry set/lower)
            case 12: condCode = '(c.cn===c.cv)'; break;  // GE (greater or equal)
            case 13: condCode = '(c.cn!==c.cv)'; break;  // LT (less than)
            case 14: condCode = '(!c.cz&&(c.cn===c.cv))'; break;  // GT (greater than)
            case 15: condCode = '(c.cz||(c.cn!==c.cv))'; break;  // LE (less or equal)
        }
        
        return {
            'code': ['if(' + condCode + '){c.pc=' + branchTarget + ';}else{c.pc=' + fallThrough + ';}'],
            'pc': branchTarget,
            'quit': true
        };
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

        // SBCD (1000yyy10000xsss)
        if ((inst & 0xf1f8) === 0x8100 || (inst & 0xf1f8) === 0x8108) {
            var srcReg = inst & 7;
            var memMode = (inst & 0x8) !== 0;
            if (memMode) {
                var srcStep = srcReg === 7 ? 2 : 1;
                var dstStep = r === 7 ? 2 : 1;
                code.push('c.a[' + srcReg + ']-=' + srcStep + ';');
                code.push('c.a[' + r + ']-=' + dstStep + ';');
                code.push('var src=c.l8(c.a[' + srcReg + ']);');
                code.push('var dst=c.l8(c.a[' + r + ']);');
            } else {
                code.push('var src=c.d[' + srcReg + ']&0xff;');
                code.push('var dst=c.d[' + r + ']&0xff;');
            }
            code.push('var x=(c.cx?1:0);');
            code.push('var binRes=(dst&0xff)-(src&0xff)-x;');
            code.push('var res=binRes;');
            code.push('var lowSub=(dst&0x0f)-(src&0x0f)-x;');
            code.push('if(lowSub<0){res-=6;}');
            code.push('var cFlagSub=(binRes<0);');
            code.push('if(cFlagSub){res-=0x60;}');
            code.push('var cFlagSr=(cFlagSub||(res<0));');
            code.push('var result=res&0xff;');
            code.push('var rawRes=binRes&0xff;');
            code.push('var vFlag=(((~result)&rawRes)&0x80)!==0;');
            code.push('if(vFlag&&((((~src)&dst)&0x80)!==0)&&cFlagSr){vFlag=false;}');
            code.push('c.cn=((result&0x80)!==0);');
            code.push('c.cv=vFlag;');
            code.push('c.cc=cFlagSr;');
            code.push('c.cx=cFlagSr;');
            code.push('if(result!==0)c.cz=0;');
            if (memMode)
                code.push('c.s8(c.a[' + r + '],result);');
            else
                code.push('c.d[' + r + ']=(c.d[' + r + ']&0xffffff00)|result;');
            return {
                'in': { 'x': true, 'z': true },
                'code': code,
                'out': { 'n': 'c.cn', 'z': 'c.cz', 'v': 'c.cv', 'c': 'c.cc', 'x': 'c.cx' },
                'pc': pc + 2
            };
        }

        switch (opmode) {
            case 3:  // DIVU
                ea = this.effectiveAddress(
                        pc, inst,
                        function (ea) { return 'c.d[' + r + ']=c.divu(' + ea + ',' + 'c.d[' + r + ']);'; },
                        function (ea) { return 'c.d[' + r + ']=c.divu(c.l16(' + ea + '),' + 'c.d[' + r + ']);'; },
                        2);
                code.push(ea.code);
                out = {
                    'n': 'c.t[0]&8',
                    'z': 'c.t[0]&4',
                    'v': 'c.t[0]&2',
                    'c': false
                };
                return {
                    'code': code,
                    'out': out,
                    'pc': ea.pc
                };
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
                return {
                    'code': code,
                    'out': out,
                    'pc': ea.pc
                };
            case 4:  // SBCD is handled above, otherwise OR.b Dn,<ea>
                break;
            case 5:  // PACK or OR.w Dn,<ea>
                if ((inst & 0xf1f0) === 0x8140 || (inst & 0xf1f0) === 0x8148) {
                    var packAdj = this.context.fetch(pc + 2);
                    if ((inst & 0x8) !== 0) {
                        var packSrc = inst & 7;
                        var packDst = r;
                        return {
                            'code': [
                                'c.a[' + packSrc + ']-=2;',
                                'c.a[' + packDst + ']-=1;',
                                'var src=((c.l8(c.a[' + packSrc + '])&0x0f)<<8)|(c.l8(c.a[' + packSrc + ']+1)&0x0f);',
                                'var tmp=(src+' + this.extS16U32(packAdj) + ')&0xffff;',
                                'var result=((tmp>>8)&0xf0)|(tmp&0x0f);',
                                'c.s8(c.a[' + packDst + '],result);'
                            ],
                            'pc': pc + 4
                        };
                    }
                    return {
                        'code': [
                            'var src=c.d[' + (inst & 7) + ']&0xffff;',
                            'var tmp=(src+' + this.extS16U32(packAdj) + ')&0xffff;',
                            'var result=((tmp>>8)&0xf0)|(tmp&0x0f);',
                            'c.d[' + r + ']=(c.d[' + r + ']&0xffffff00)|result;'
                        ],
                        'pc': pc + 4
                    };
                }
                break;
            case 6:  // UNPK or OR.l Dn,<ea>
                if ((inst & 0xf1f0) === 0x8180 || (inst & 0xf1f0) === 0x8188) {
                    var unpkAdj = this.context.fetch(pc + 2);
                    if ((inst & 0x8) !== 0) {
                        var unpkSrc = inst & 7;
                        var unpkDst = r;
                        return {
                            'code': [
                                'c.a[' + unpkSrc + ']-=1;',
                                'c.a[' + unpkDst + ']-=2;',
                                'var src=c.l8(c.a[' + unpkSrc + ']);',
                                'var tmp=((((src&0xf0)<<4)|(src&0x0f))+' + this.extS16U32(unpkAdj) + ')&0xffff;',
                                'c.s8(c.a[' + unpkDst + '],(tmp>>8)&0xff);',
                                'c.s8(c.a[' + unpkDst + ']+1,tmp&0xff);'
                            ],
                            'pc': pc + 4
                        };
                    }
                    return {
                        'code': [
                            'var src=c.d[' + (inst & 7) + ']&0xff;',
                            'var tmp=((((src&0xf0)<<4)|(src&0x0f))+' + this.extS16U32(unpkAdj) + ')&0xffff;',
                            'c.d[' + r + ']=(c.d[' + r + ']&0xffff0000)|tmp;'
                        ],
                        'pc': pc + 4
                    };
                }
                break;
        }
        if (opmode <= 2 || (opmode >= 4 && opmode <= 6)) {
            var logicSize = opmode === 0 || opmode === 4 ? 1 : opmode === 1 || opmode === 5 ? 2 : 4;
            var logicMask = logicSize === 1 ? '0xff' : logicSize === 2 ? '0xffff' : '0xffffffff';
            var logicHighBit = logicSize === 1 ? '0x80' : logicSize === 2 ? '0x8000' : '0x80000000';
            var logicKeepMask = logicSize === 1 ? '0xffffff00' : logicSize === 2 ? '0xffff0000' : '0x0';
            if (opmode <= 2) {  // OR <ea>,Dn
                ea = this.effectiveAddress(
                    pc, inst,
                    function (srcEa) {
                        if (logicSize === 4)
                            return 'var src=(' + srcEa + ')>>>0;var dst=c.d[' + r + ']>>>0;var res=(dst|src)>>>0;c.d[' + r + ']=res>>>0;';
                        return 'var src=(' + srcEa + ')&' + logicMask + ';var dst=c.d[' + r + ']&' + logicMask + ';var res=(dst|src)&' + logicMask + ';c.d[' + r + ']=(c.d[' + r + ']&' + logicKeepMask + ')|res;';
                    },
                    function (srcEa) {
                        if (logicSize === 1) return 'var src=c.l8(' + srcEa + ');var dst=c.d[' + r + ']&0xff;var res=(dst|src)&0xff;c.d[' + r + ']=(c.d[' + r + ']&0xffffff00)|res;';
                        if (logicSize === 2) return 'var src=c.l16(' + srcEa + ');var dst=c.d[' + r + ']&0xffff;var res=(dst|src)&0xffff;c.d[' + r + ']=(c.d[' + r + ']&0xffff0000)|res;';
                        return 'var src=c.l32(' + srcEa + ');var dst=c.d[' + r + ']>>>0;var res=(dst|src)>>>0;c.d[' + r + ']=res>>>0;';
                    },
                    logicSize
                );
                return {
                    'code': [ea.code],
                    'out': { 'n': '((res&' + logicHighBit + ')!=0)', 'z': '((res&' + logicMask + ')==0)', 'v': '0', 'c': '0' },
                    'pc': ea.pc
                };
            }
            var orDst = this.effectiveAddressDst(
                pc + 2, (inst >> 3) & 7, inst & 7,
                function (dstEa) {
                    if (logicSize === 4)
                        return 'var src=c.d[' + r + ']>>>0;var dst=(' + dstEa + ')>>>0;var res=(dst|src)>>>0;' + dstEa + '=res>>>0;';
                    return 'var src=c.d[' + r + ']&' + logicMask + ';var dst=(' + dstEa + ')&' + logicMask + ';var res=(dst|src)&' + logicMask + ';' + dstEa + '=((' + dstEa + ')&' + logicKeepMask + ')|res;';
                },
                function (dstEa) {
                    if (logicSize === 1) return 'var src=c.d[' + r + ']&0xff;var dst=c.l8(' + dstEa + ');var res=(dst|src)&0xff;c.s8(' + dstEa + ',res);';
                    if (logicSize === 2) return 'var src=c.d[' + r + ']&0xffff;var dst=c.l16(' + dstEa + ');var res=(dst|src)&0xffff;c.s16(' + dstEa + ',res);';
                    return 'var src=c.d[' + r + ']>>>0;var dst=c.l32(' + dstEa + ');var res=(dst|src)>>>0;c.s32(' + dstEa + ',res>>>0);';
                },
                logicSize
            );
            return {
                'code': [orDst.code],
                'out': { 'n': '((res&' + logicHighBit + ')!=0)', 'z': '((res&' + logicMask + ')==0)', 'v': '0', 'c': '0' },
                'pc': orDst.pc
            };
        }
        this.log('line 8 not impl opmode: ' + opmode);
        throw console.assert(false);
    };

    j68.prototype.decode9 = function (pc, inst) {
        // SUB, SUBA
        var r = (inst >> 9) & 7;
        var opmode = (inst >> 6) & 7;
        var code = [];
        var ea;
        var size = 4;
        var sizeMask = '0xffffffff';
        var highBit = '0x80000000';
        var keepMask = '0x0';
        if (opmode === 0 || opmode === 4) {
            size = 1;
            sizeMask = '0xff';
            highBit = '0x80';
            keepMask = '0xffffff00';
        } else if (opmode === 1 || opmode === 5 || opmode === 3) {
            size = 2;
            sizeMask = '0xffff';
            highBit = '0x8000';
            keepMask = '0xffff0000';
        }
        switch (opmode) {
            case 0:  // SUB.b EA, Dn
            case 1:  // SUB.w EA, Dn
            case 2:  // SUB.l EA, Dn
                ea = this.effectiveAddress(
                        pc, inst,
                        function (srcEa) {
                            return 'var src=(' + srcEa + ')&' + sizeMask + ';' +
                                   'var srcx=src;' +
                                   'var dst=c.d[' + r + ']&' + sizeMask + ';' +
                                   'var ext=src;' +
                                   'var res=(dst-ext)&' + sizeMask + ';' +
                                   (size === 4 ?
                                        'c.d[' + r + ']=res>>>0;' :
                                        'c.d[' + r + ']=(c.d[' + r + ']&' + keepMask + ')|res;');
                        },
                        function (srcEa) {
                            if (size === 1) return 'var src=c.l8(' + srcEa + ');var srcx=src;var dst=c.d[' + r + ']&0xff;var ext=src;var res=(dst-ext)&0xff;c.d[' + r + ']=(c.d[' + r + ']&0xffffff00)|res;';
                            if (size === 2) return 'var src=c.l16(' + srcEa + ');var srcx=src;var dst=c.d[' + r + ']&0xffff;var ext=src;var res=(dst-ext)&0xffff;c.d[' + r + ']=(c.d[' + r + ']&0xffff0000)|res;';
                            return 'var src=c.l32(' + srcEa + ');var srcx=src;var dst=c.d[' + r + ']>>>0;var ext=src;var res=(dst-ext)>>>0;c.d[' + r + ']=res>>>0;';
                        },
                        size);
                return {
                    'code': [ ea.code ],
                    'out': {
                        'n': '((res&' + highBit + ')!=0)',
                        'z': '((res&' + sizeMask + ')==0)',
                        'v': '(((dst&' + highBit + ')!=(srcx&' + highBit + '))&&((res&' + highBit + ')!=(dst&' + highBit + ')))',
                        'c': '((dst&' + sizeMask + ')<ext)',
                        'x': '((dst&' + sizeMask + ')<ext)'
                    },
                    'pc': ea.pc
                };
            case 3:  // SUBA.W
                ea = this.effectiveAddress(
                        pc, inst,
                        function (srcEa) { return 'c.a[' + r + ']-=c.xw((' + srcEa + ')&0xffff);'; },
                        function (srcEa) { return 'c.a[' + r + ']-=c.xw(c.l16(' + srcEa + ')&0xffff);'; },
                        2);
                code.push(ea.code);
                break;
            case 4:  // SUBX.b / SUB.b Dn,EA
            case 5:  // SUBX.w / SUB.w Dn,EA
            case 6:  // SUBX.l / SUB.l Dn,EA
                if ((inst & 0x0030) === 0x0000) {
                    var srcReg = inst & 7;
                    var isMem = (inst & 0x0008) !== 0;
                    if (!isMem) {
                        code.push('var src=c.d[' + srcReg + ']&' + sizeMask + ';');
                        code.push('var x=(c.cx?1:0);');
                        code.push('var srcx=(src+x)&' + sizeMask + ';');
                        code.push('var dst=c.d[' + r + ']&' + sizeMask + ';');
                        code.push('var ext=src+x;');
                        code.push('var res=(dst-ext)&' + sizeMask + ';');
                        if (size === 4)
                            code.push('c.d[' + r + ']=res>>>0;');
                        else
                            code.push('c.d[' + r + ']=(c.d[' + r + ']&' + keepMask + ')|res;');
                    } else {
                        var srcStep = (size === 1 && srcReg === 7) ? 2 : size;
                        var dstStep = (size === 1 && r === 7) ? 2 : size;
                        code.push('c.a[' + srcReg + ']-=' + srcStep + ';');
                        code.push('c.a[' + r + ']-=' + dstStep + ';');
                        if (size === 1) {
                            code.push('var src=c.l8(c.a[' + srcReg + ']);');
                            code.push('var dst=c.l8(c.a[' + r + ']);');
                        } else if (size === 2) {
                            code.push('var src=c.l16(c.a[' + srcReg + ']);');
                            code.push('var dst=c.l16(c.a[' + r + ']);');
                        } else {
                            code.push('var src=c.l32(c.a[' + srcReg + ']);');
                            code.push('var dst=c.l32(c.a[' + r + ']);');
                        }
                        code.push('var x=(c.cx?1:0);');
                        code.push('var srcx=(src+x)&' + sizeMask + ';');
                        code.push('var ext=src+x;');
                        code.push('var res=(dst-ext)&' + sizeMask + ';');
                        if (size === 1)
                            code.push('c.s8(c.a[' + r + '],res);');
                        else if (size === 2)
                            code.push('c.s16(c.a[' + r + '],res);');
                        else
                            code.push('c.s32(c.a[' + r + '],res>>>0);');
                    }
                    return {
                        'code': code,
                        'out': {
                            'n': '((res&' + highBit + ')!=0)',
                            'z': '(c.cz&&((res&' + sizeMask + ')==0))',
                            'v': '(((dst&' + highBit + ')!=(srcx&' + highBit + '))&&((res&' + highBit + ')!=(dst&' + highBit + ')))',
                            'c': '((dst&' + sizeMask + ')<ext)',
                            'x': '((dst&' + sizeMask + ')<ext)'
                        },
                        'pc': pc + 2
                    };
                }
                this.log('sub not impl opmode: ' + opmode);
                throw console.assert(false);
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
                        function (ea) { return 'c.a[' + r + ']+=c.xw(' + ea + '&0xffff);'; },
                        function (ea) { return 'c.a[' + r + ']+=c.xw(c.l16(' + ea + ')&0xffff);'; },
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

    j68.prototype.bitFieldEa = function (pc, inst) {
        var mode = (inst >> 3) & 7;
        var r = inst & 7;
        var disp;
        switch (mode) {
            case 0:
                return {
                    'kind': 'reg',
                    'index': r,
                    'pc': pc + 2
                };
            case 2:
                return {
                    'kind': 'mem',
                    'ea': '(c.a[' + r + ']>>>0)',
                    'pc': pc + 2
                };
            case 5:
                disp = this.context.fetch(pc);
                return {
                    'kind': 'mem',
                    'ea': '((c.a[' + r + ']+c.xw(' + disp + '))>>>0)',
                    'pc': pc + 4
                };
            case 6:
                disp = this.context.fetch(pc);
                if (disp & 0x0100)
                    throw console.assert(false);
                var regName = ((disp & 0x8000) ? 'c.a[' : 'c.d[') + ((disp >> 12) & 7) + ']';
                if (0 === (disp & 0x0800))
                    regName = 'c.xw(' + regName + '&0xffff)';
                var scale = (disp >> 9) & 3;
                if (scale !== 0)
                    regName = '(' + regName + [ '<<1)', '<<2)', '<<3)' ][scale - 1];
                return {
                    'kind': 'mem',
                    'ea': '((c.a[' + r + ']+' + regName + '+' + this.extS8U32(disp & 0xff) + ')>>>0)',
                    'pc': pc + 4
                };
            case 7:
                switch (r) {
                    case 0:
                        return {
                            'kind': 'mem',
                            'ea': this.extS16U32(this.context.fetch(pc)),
                            'pc': pc + 4
                        };
                    case 1:
                        return {
                            'kind': 'mem',
                            'ea': this.context.l32(pc) >>> 0,
                            'pc': pc + 6
                        };
                    case 2:
                        disp = this.context.fetch(pc);
                        return {
                            'kind': 'mem',
                            'ea': '(' + (pc + 2) + '+c.xw(' + disp + '))>>>0',
                            'pc': pc + 4
                        };
                    case 3:
                        disp = this.context.fetch(pc);
                        if (disp & 0x0100)
                            throw console.assert(false);
                        var pcRegName = ((disp & 0x8000) ? 'c.a[' : 'c.d[') + ((disp >> 12) & 7) + ']';
                        if (0 === (disp & 0x0800))
                            pcRegName = 'c.xw(' + pcRegName + '&0xffff)';
                        var pcScale = (disp >> 9) & 3;
                        if (pcScale !== 0)
                            pcRegName = '(' + pcRegName + [ '<<1)', '<<2)', '<<3)' ][pcScale - 1];
                        return {
                            'kind': 'mem',
                            'ea': '((' + (pc + 2) + '+' + pcRegName + '+' + this.extS8U32(disp & 0xff) + ')>>>0)',
                            'pc': pc + 4
                        };
                }
        }
        this.log('bitfield EA not impl mode: ' + mode + ' r: ' + r);
        throw console.assert(false);
    };

    j68.prototype.decodeF = function (pc, inst) {
        // MC68040 MMU opcodes.
        if (inst === 0xf518 || (inst & 0xfff8) === 0xf508 ||
                (inst & 0xfff8) === 0xf548 || (inst & 0xfff8) === 0xf568) {
            if (this.type < j68.TYPE_MC68040) {
                return {
                    'in': { 'pc': true, 'sr': true },
                    'code': [ 'c.exception(4,' + pc + ');' ],
                    'pc': pc + 2,
                    'quit': true
                };
            }
            return {
                'in': { 'pc': true, 'sr': true },
                'code': [ 'if((c.sr&0x2000)===0){c.exception(8,' + pc + ');}' ],
                'pc': pc + 2,
                'quit': true
            };
        }

        // MC68030 PMMU opcodes. These are F-line unimplemented on the MC68040.
        if ((inst & 0xfff8) === 0xf010) {
            var ext = this.context.fetch(pc + 2);

            if (this.type !== j68.TYPE_MC68030) {
                return {
                    'in': { 'pc': true, 'sr': true },
                    'code': [ 'c.exception(4,' + pc + ');' ],
                    'pc': pc + 4,
                    'quit': true
                };
            }

            if ((ext & 0xfc00) === 0x2000) {
                return {
                    'in': { 'pc': true, 'sr': true },
                    'code': [ 'if((c.sr&0x2000)===0){c.exception(8,' + pc + ');}' ],
                    'pc': pc + 4,
                    'quit': true
                };
            }

            if (ext === 0x4000) {
                var pmoveMode = (inst >> 3) & 7;
                var pmoveReg = inst & 7;
                if (pmoveMode !== 2) {
                    this.log('pmove tc src not impl mode: ' + pmoveMode);
                    throw console.assert(false);
                }
                return {
                    'in': { 'pc': true, 'sr': true },
                    'code': [ 'if((c.sr&0x2000)===0){c.exception(8,' + pc + ');}else{c.tc=c.l32(c.a[' + pmoveReg + '])>>>0;}' ],
                    'pc': pc + 4,
                    'quit': true
                };
            }

            if (ext === 0x4200) {
                var mode = (inst >> 3) & 7;
                var r = inst & 7;
                if (mode !== 2) {
                    this.log('pmove tc dst not impl mode: ' + mode);
                    throw console.assert(false);
                }
                var pmoveDst = this.effectiveAddressDst(
                    pc + 4, mode, r,
                    function (ea) { return ea + '=c.tc>>>0;'; },
                    function (ea) { return 'c.s32(' + ea + ',c.tc>>>0);'; },
                    4
                );
                return {
                    'in': { 'pc': true, 'sr': true },
                    'code': [ 'if((c.sr&0x2000)===0){c.exception(8,' + pc + ');}else{' + pmoveDst.code + '}' ],
                    'pc': pmoveDst.pc,
                    'quit': true
                };
            }
        }

        // MOVE16 (MC68040)
        if ((inst & 0xffe0) === 0xf600 || (inst & 0xfff8) === 0xf620) {
            if (this.type < j68.TYPE_MC68040) {
                return {
                    'in': { 'pc': true, 'sr': true },
                    'code': [ 'c.exception(4,' + pc + ');' ],
                    'pc': pc + 2,
                    'quit': true
                };
            }
            if ((inst & 0xfff8) === 0xf620) {
                var move16SrcReg = inst & 7;
                var move16Ext = this.context.fetch(pc + 2);
                var move16DstReg = ((move16Ext >> 12) & 7);
                return {
                    'code': [
                        'c.move16(c.a[' + move16SrcReg + '],c.a[' + move16DstReg + ']);',
                        'c.a[' + move16SrcReg + ']=(c.a[' + move16SrcReg + ']+16)>>>0;',
                        'c.a[' + move16DstReg + ']=(c.a[' + move16DstReg + ']+16)>>>0;'
                    ],
                    'pc': pc + 4
                };
            }

            var move16Opmode = (inst >> 3) & 3;
            var move16Reg = inst & 7;
            var move16Abs = this.context.l32(pc + 2) >>> 0;
            var move16Code;
            switch (move16Opmode) {
                case 0: // (Ay)+,(xxx).L
                    move16Code = [
                        'c.move16(c.a[' + move16Reg + '],' + move16Abs + ');',
                        'c.a[' + move16Reg + ']=(c.a[' + move16Reg + ']+16)>>>0;'
                    ];
                    break;
                case 1: // (xxx).L,(Ay)+
                    move16Code = [
                        'c.move16(' + move16Abs + ',c.a[' + move16Reg + ']);',
                        'c.a[' + move16Reg + ']=(c.a[' + move16Reg + ']+16)>>>0;'
                    ];
                    break;
                case 2: // (Ay),(xxx).L
                    move16Code = [ 'c.move16(c.a[' + move16Reg + '],' + move16Abs + ');' ];
                    break;
                case 3: // (xxx).L,(Ay)
                    move16Code = [ 'c.move16(' + move16Abs + ',c.a[' + move16Reg + ']);' ];
                    break;
            }
            return {
                'code': move16Code,
                'pc': pc + 6
            };
        }

        // CINV / CPUSH (MC68040+ cache control)
        if ((inst & 0xff00) === 0xf400) {
            var scope = (inst >> 3) & 3;
            if (this.type < j68.TYPE_MC68040) {
                return {
                    'in': { 'pc': true, 'sr': true },
                    'code': [ 'c.exception(4,' + pc + ');' ],
                    'pc': pc + 2,
                    'quit': true
                };
            }
            if (scope === 0) {
                return {
                    'in': { 'pc': true, 'sr': true },
                    'code': [ 'c.exception(4,' + pc + ');' ],
                    'pc': pc + 2,
                    'quit': true
                };
            }
            return {
                'in': { 'pc': true, 'sr': true },
                'code': [ 'if((c.sr&0x2000)===0){c.exception(8,' + pc + ');}' ],
                'pc': pc + 2,
                'quit': true
            };
        }

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

    j68.prototype.flagSub = function (dst, src, res, highBit, sizeMask) {
        return {
            'n': '(((' + res + ')&' + highBit + ')!=0)',
            'z': '(((' + res + ')&' + sizeMask + ')==0)',
            'v': '(((' + dst + '&' + highBit + ')!=((' + src + ')&' + highBit + '))&&(((' + res + ')&' + highBit + ')!=((' + dst + ')&' + highBit + ')))',
            'c': '(((' + dst + ')&' + sizeMask + ')<((' + src + ')&' + sizeMask + '))'
        };
    };
    

    // Line 0: Bit test/modify, immediate logic
    j68.prototype.decode0 = function (pc, inst) {
        var opmode = (inst >> 6) & 0x3f;
        var r = (inst >> 9) & 7;
        
        // Check for ANDI/ORI/EORI to CCR/SR
        if (inst === 0x023c) {  // ANDI to CCR
            var data = this.context.fetch(pc + 2);
            return { 'code': ['c.setCcr(c.sr&' + (data&0xff) + ');'], 'pc': pc + 4 };
        }
        if (inst === 0x027c) {  // ANDI to SR
            var data = this.context.fetch(pc + 2);
            return { 'in': { 'sr': true }, 'code': ['c.setSr((c.sr&0xffff)&' + data + ');'], 'pc': pc + 4 };
        }
        if (inst === 0x003c) {  // ORI to CCR
            var data = this.context.fetch(pc + 2);
            return { 'code': ['c.setCcr(c.sr|' + (data&0xff) + ');'], 'pc': pc + 4 };
        }
        if (inst === 0x007c) {  // ORI to SR
            var data = this.context.fetch(pc + 2);
            return { 'in': { 'sr': true }, 'code': ['c.setSr((c.sr&0xffff)|' + data + ');'], 'pc': pc + 4 };
        }
        if (inst === 0x0a3c) {  // EORI to CCR
            var data = this.context.fetch(pc + 2);
            return { 'code': ['c.setCcr(c.sr^' + (data&0xff) + ');'], 'pc': pc + 4 };
        }
	        if (inst === 0x0a7c) {  // EORI to SR
	            var data = this.context.fetch(pc + 2);
	            return { 'in': { 'sr': true }, 'code': ['c.setSr((c.sr&0xffff)^' + data + ');'], 'pc': pc + 4 };
	        }

	        // CAS (00001ss011mmmrrr with extension word)
	        if ((inst & 0x09c0) === 0x08c0) {
	            var casSizeBits = (inst >> 9) & 3;
	            var casMode = (inst >> 3) & 7;
	            var casEaReg = inst & 7;
	            if (casSizeBits >= 1 &&
	                (casMode === 2 || casMode === 3 || casMode === 4 ||
	                 casMode === 5 || casMode === 6 ||
	                 (casMode === 7 && casEaReg <= 1))) {
	                var casExt = this.context.fetch(pc + 2);
	                var casCmpReg = casExt & 7;
	                var casUpdReg = (casExt >> 6) & 7;
	                var casSize = casSizeBits === 1 ? 1 : casSizeBits === 2 ? 2 : 4;
	                var casSizeMask = casSize === 1 ? '0xff' : casSize === 2 ? '0xffff' : '0xffffffff';
	                var casHighBit = casSize === 1 ? '0x80' : casSize === 2 ? '0x8000' : '0x80000000';
	                var casKeepMask = casSize === 1 ? '0xffffff00' : '0xffff0000';
	                var casEa = this.effectiveAddress(
	                    pc + 2, inst,
	                    function () { return 'throw console.assert(false);'; },
	                    function (ea) {
	                        if (casSize === 1) {
	                            return 'var dst=c.l8(' + ea + ');var src=c.d[' + casCmpReg + ']&0xff;var res=(dst-src)&0xff;' +
	                                'if(res===0){c.s8(' + ea + ',c.d[' + casUpdReg + ']&0xff);}else{c.d[' + casCmpReg + ']=(c.d[' + casCmpReg + ']&' + casKeepMask + ')|dst;}';
	                        }
	                        if (casSize === 2) {
	                            return 'var dst=c.l16(' + ea + ');var src=c.d[' + casCmpReg + ']&0xffff;var res=(dst-src)&0xffff;' +
	                                'if(res===0){c.s16(' + ea + ',c.d[' + casUpdReg + ']&0xffff);}else{c.d[' + casCmpReg + ']=(c.d[' + casCmpReg + ']&' + casKeepMask + ')|dst;}';
	                        }
	                        return 'var dst=c.l32(' + ea + ')>>>0;var src=c.d[' + casCmpReg + ']>>>0;var res=(dst-src)>>>0;' +
	                            'if(res===0){c.s32(' + ea + ',c.d[' + casUpdReg + ']>>>0);}else{c.d[' + casCmpReg + ']=dst>>>0;}';
	                    },
	                    casSize
	                );
	                return {
	                    'code': [casEa.code],
	                    'out': this.flagSub('dst', 'src', 'res', casHighBit, casSizeMask),
	                    'pc': casEa.pc
	                };
	            }
	        }

	        // MOVES (00001110dr000mmmrrr with extension word)
	        if ((inst & 0x0f38) === 0x0e10) {
	            var movesSizeBits = (inst >> 6) & 3;
	            var movesMode = (inst >> 3) & 7;
	            var movesEaReg = inst & 7;
	            if (movesSizeBits !== 3 &&
	                (movesMode === 2 || movesMode === 3 || movesMode === 4 ||
	                 movesMode === 5 || movesMode === 6 ||
	                 (movesMode === 7 && movesEaReg <= 1))) {
	                var movesExt = this.context.fetch(pc + 2);
	                var movesRegIsAddress = (movesExt & 0x8000) !== 0;
	                var movesReg = (movesExt >> 12) & 7;
	                var movesRegRef = (movesRegIsAddress ? 'c.a[' : 'c.d[') + movesReg + ']';
	                var movesRegToEa = (movesExt & 0x0800) !== 0;
	                var movesSize = movesSizeBits === 0 ? 1 : movesSizeBits === 1 ? 2 : 4;
	                var movesEa = this.effectiveAddress(
	                    pc + 2, inst,
	                    function () { return 'throw console.assert(false);'; },
	                    function (ea) {
	                        if (movesRegToEa) {
	                            if (movesSize === 1) return 'c.s8(' + ea + ',' + movesRegRef + '&0xff);';
	                            if (movesSize === 2) return 'c.s16(' + ea + ',' + movesRegRef + '&0xffff);';
	                            return 'c.s32(' + ea + ',' + movesRegRef + '>>>0);';
	                        }
	                        if (movesSize === 1) {
	                            if (movesRegIsAddress) return movesRegRef + '=(c.l8(' + ea + ')<<24)>>24;';
	                            return movesRegRef + '=(' + movesRegRef + '&0xffffff00)|c.l8(' + ea + ');';
	                        }
	                        if (movesSize === 2) {
	                            if (movesRegIsAddress) return movesRegRef + '=c.xw(c.l16(' + ea + '));';
	                            return movesRegRef + '=(' + movesRegRef + '&0xffff0000)|c.l16(' + ea + ');';
	                        }
	                        return movesRegRef + '=c.l32(' + ea + ')>>>0;';
	                    },
	                    movesSize
	                );
	                return {
	                    'in': { 'pc': true, 'sr': true },
	                    'code': [
                        'if((c.sr&0x2000)===0){c.exception(8,' + pc + ');}else{' + movesEa.code + '}'
	                    ],
	                    'pc': movesEa.pc,
	                    'quit': true
	                };
	            }
	        }

	        // CMPI (00001100ssmmmrrr)
	        if ((inst & 0xff00) === 0x0c00) {
            var sizeBits = (inst >> 6) & 3;
            if (sizeBits === 3)
                throw console.assert(false);
            var size = sizeBits === 0 ? 1 : sizeBits === 1 ? 2 : 4;
            var sizeMask = size === 1 ? '0xff' : size === 2 ? '0xffff' : '0xffffffff';
            var highBit = size === 1 ? '0x80' : size === 2 ? '0x8000' : '0x80000000';
            var imm = size === 4 ? this.context.l32(pc + 2) : this.context.fetch(pc + 2);
            var eaBase = pc + (size === 4 ? 4 : 2);
            var cmpiEa = this.effectiveAddress(
                eaBase, inst,
                function (ea) { return 'var src=' + imm + '&' + sizeMask + ';var dst=(' + ea + ')&' + sizeMask + ';var res=(dst-src)&' + sizeMask + ';'; },
                function (ea) {
                    if (size === 1) return 'var src=' + (imm & 0xff) + ';var dst=c.l8(' + ea + ');var res=(dst-src)&0xff;';
                    if (size === 2) return 'var src=' + (imm & 0xffff) + ';var dst=c.l16(' + ea + ');var res=(dst-src)&0xffff;';
                    return 'var src=' + (imm >>> 0) + ';var dst=c.l32(' + ea + ');var res=(dst-src)>>>0;';
                },
                size
            );
            return {
                'code': [cmpiEa.code],
                'out': this.flagSub('dst', 'src', 'res', highBit, sizeMask),
                'pc': cmpiEa.pc
	            };
	        }

	        // CHK2/CMP2 (00000ss011mmmrrr with extension word)
	        if ((inst & 0xf1c0) === 0x00c0) {
	            var chk2SizeBits = (inst >> 9) & 3;
	            var chk2Mode = (inst >> 3) & 7;
	            var chk2EaReg = inst & 7;
	            if (chk2SizeBits !== 3 &&
	                (chk2Mode === 2 || chk2Mode === 5 || chk2Mode === 6 ||
	                 (chk2Mode === 7 && chk2EaReg <= 3))) {
	                var chk2Ext = this.context.fetch(pc + 2);
	                var chk2IsAddress = (chk2Ext & 0x8000) !== 0;
	                var chk2Reg = (chk2Ext >> 12) & 7;
	                var chk2IsTrap = (chk2Ext & 0x0800) !== 0;
	                var chk2Size = chk2SizeBits === 0 ? 1 : chk2SizeBits === 1 ? 2 : 4;
	                var chk2LoadBounds;
	                if (chk2Size === 1) {
	                    chk2LoadBounds = function (ea) {
	                        return 'var lower=(c.l8(' + ea + ')<<24)>>24;var upper=(c.l8((' + ea + '+1)>>>0)<<24)>>24;';
	                    };
	                } else if (chk2Size === 2) {
	                    chk2LoadBounds = function (ea) {
	                        return 'var lower=c.xw(c.l16(' + ea + '));var upper=c.xw(c.l16((' + ea + '+2)>>>0));';
	                    };
	                } else {
	                    chk2LoadBounds = function (ea) {
	                        return 'var lower=c.l32(' + ea + ')|0;var upper=c.l32((' + ea + '+4)>>>0)|0;';
	                    };
	                }
	                var chk2Ea = this.effectiveAddress(
	                    pc + 2, inst,
	                    function () { return 'throw console.assert(false);'; },
	                    chk2LoadBounds,
	                    chk2Size
	                );
	                var chk2RegExpr;
	                if (chk2IsAddress) {
	                    chk2RegExpr = 'c.a[' + chk2Reg + ']|0';
	                } else if (chk2Size === 1) {
	                    chk2RegExpr = '((c.d[' + chk2Reg + ']&0xff)<<24)>>24';
	                } else if (chk2Size === 2) {
	                    chk2RegExpr = 'c.xw(c.d[' + chk2Reg + ']&0xffff)';
	                } else {
	                    chk2RegExpr = 'c.d[' + chk2Reg + ']|0';
	                }
	                var chk2Code = [];
	                chk2Code.push(chk2Ea.code);
	                chk2Code.push('var reg=' + chk2RegExpr + ';');
	                chk2Code.push('var outOfBounds=false;');
	                chk2Code.push('c.cz=((reg===lower)||(reg===upper));');
	                chk2Code.push('if(!c.cz){');
	                chk2Code.push('if(lower<=upper){outOfBounds=(reg<lower||reg>upper);}');
	                chk2Code.push('else{outOfBounds=(reg>upper&&reg<lower);}');
	                chk2Code.push('}');
	                chk2Code.push('c.cc=outOfBounds;');
	                if (chk2IsTrap) {
	                    chk2Code.push('if(outOfBounds){c.exception(6,' + pc + ');}');
	                    return {
	                        'in': { 'pc': true, 'sr': true },
	                        'code': chk2Code,
	                        'pc': chk2Ea.pc,
	                        'quit': true
	                    };
	                }
	                return {
	                    'code': chk2Code,
	                    'pc': chk2Ea.pc
	                };
	            }
	        }

	        // 68020 CALLM/RTM occupy line 0 opcode space and must not fall
	        // through into the OR/ORI matcher used for 68000 instructions.
        if ((inst & 0xfff8) === 0x06c0 ||
            (inst & 0xfff8) === 0x06c8 ||
            (inst & 0xfff8) === 0x06d0 ||
            (inst & 0xfff8) === 0x06e8 ||
            (inst & 0xfff8) === 0x06f0 ||
            (inst & 0xfffc) === 0x06f8) {
            this.log('not impl: line=0 CALLM/RTM inst=' + inst.toString(16));
            throw console.assert(false);
        }

        // MOVEP (0000ddd1oo001aaa)
        if ((inst & 0xf138) === 0x0108) {
            var movepOpmode = (inst >> 6) & 7;
            var addrReg = inst & 7;
            var disp16 = this.context.fetch(pc + 2);
            var baseEa = '((c.a[' + addrReg + ']+' + this.extS16U32(disp16) + ')>>>0)';
            if (movepOpmode === 4) {  // MOVEP.W (d16,Ay),Dx
                return {
                    'code': [
                        'var ea=' + baseEa + ';',
                        'c.d[' + r + ']=((c.l8(ea)<<8)|c.l8(ea+2))>>>0;'
                    ],
                    'out': this.flagMove('c.d[' + r + ']'),
                    'pc': pc + 4
                };
            }
            if (movepOpmode === 5) {  // MOVEP.L (d16,Ay),Dx
                return {
                    'code': [
                        'var ea=' + baseEa + ';',
                        'c.d[' + r + ']=((c.l8(ea)<<24)|(c.l8(ea+2)<<16)|(c.l8(ea+4)<<8)|c.l8(ea+6))>>>0;'
                    ],
                    'out': this.flagMove('c.d[' + r + ']'),
                    'pc': pc + 4
                };
            }
            if (movepOpmode === 6) {  // MOVEP.W Dx,(d16,Ay)
                return {
                    'code': [
                        'var ea=' + baseEa + ';',
                        'var src=c.d[' + r + ']&0xffff;',
                        'c.s8(ea,(src>>8)&0xff);',
                        'c.s8(ea+2,src&0xff);'
                    ],
                    'pc': pc + 4
                };
            }
            if (movepOpmode === 7) {  // MOVEP.L Dx,(d16,Ay)
                return {
                    'code': [
                        'var ea=' + baseEa + ';',
                        'var src=c.d[' + r + ']>>>0;',
                        'c.s8(ea,(src>>>24)&0xff);',
                        'c.s8(ea+2,(src>>>16)&0xff);',
                        'c.s8(ea+4,(src>>>8)&0xff);',
                        'c.s8(ea+6,src&0xff);'
                    ],
                    'pc': pc + 4
                };
            }
        }

        // Bit operations (BTST/BCLR/BCHG/BSET)
        // Immediate form: 00001000oossmmmmrrr
        if ((inst & 0x0f00) === 0x0800) {
            var bitOpImm = (inst >> 6) & 3;  // 0=BTST,1=BCHG,2=BCLR,3=BSET
            var bitNumImm = this.context.fetch(pc + 2) & 0xff;
            var modeImm = (inst >> 3) & 7;
            var dstImm = inst & 7;

            // Register direct destination: bit number modulo 32.
            if (modeImm === 0) {
                var regCode = [];
                regCode.push('var bit=' + bitNumImm + '&31;');
                regCode.push('var mask=(1<<bit);');
                regCode.push('var dst=c.d[' + dstImm + ']>>>0;');
                regCode.push('var wasZero=((dst&mask)===0);');
                if (bitOpImm === 1) regCode.push('dst=(dst^mask)>>>0;');
                if (bitOpImm === 2) regCode.push('dst=(dst&(~mask))>>>0;');
                if (bitOpImm === 3) regCode.push('dst=(dst|mask)>>>0;');
                if (bitOpImm !== 0) regCode.push('c.d[' + dstImm + ']=dst;');
                return {
                    'code': regCode,
                    'out': { 'z': 'wasZero' },
                    'pc': pc + 4
                };
            }

            // Memory destination: bit number modulo 8.
            var eaImm = this.effectiveAddress(
                pc + 2, inst,
                function () { return 'throw console.assert(false);'; },
                function (ea) {
                    var memCode = [];
                    memCode.push('var bit=' + bitNumImm + '&7;');
                    memCode.push('var mask=(1<<bit);');
                    memCode.push('var dst=c.l8(' + ea + ');');
                    memCode.push('var wasZero=((dst&mask)===0);');
                    if (bitOpImm === 1) memCode.push('dst=(dst^mask)&0xff;');
                    if (bitOpImm === 2) memCode.push('dst=(dst&(~mask))&0xff;');
                    if (bitOpImm === 3) memCode.push('dst=(dst|mask)&0xff;');
                    if (bitOpImm !== 0) memCode.push('c.s8(' + ea + ',dst);');
                    return memCode.join('');
                },
                1
            );
            return {
                'code': [eaImm.code],
                'out': { 'z': 'wasZero' },
                'pc': eaImm.pc
            };
        }

        // Register bit-number form: 0000rrr1oossmmmmrrr
        if ((inst & 0x0100) !== 0) {
            var bitOpReg = (inst >> 6) & 3;  // 0=BTST,1=BCHG,2=BCLR,3=BSET
            var modeReg = (inst >> 3) & 7;
            var dstReg = inst & 7;

            // Register direct destination: bit number modulo 32.
            if (modeReg === 0) {
                var regCode2 = [];
                regCode2.push('var bit=(c.d[' + r + ']&31);');
                regCode2.push('var mask=(1<<bit);');
                regCode2.push('var dst=c.d[' + dstReg + ']>>>0;');
                regCode2.push('var wasZero=((dst&mask)===0);');
                if (bitOpReg === 1) regCode2.push('dst=(dst^mask)>>>0;');
                if (bitOpReg === 2) regCode2.push('dst=(dst&(~mask))>>>0;');
                if (bitOpReg === 3) regCode2.push('dst=(dst|mask)>>>0;');
                if (bitOpReg !== 0) regCode2.push('c.d[' + dstReg + ']=dst;');
                return {
                    'code': regCode2,
                    'out': { 'z': 'wasZero' },
                    'pc': pc + 2
                };
            }

            // Memory destination: bit number modulo 8.
            var eaReg = this.effectiveAddress(
                pc, inst,
                function () { return 'throw console.assert(false);'; },
                function (ea) {
                    var memCode2 = [];
                    memCode2.push('var bit=(c.d[' + r + ']&7);');
                    memCode2.push('var mask=(1<<bit);');
                    memCode2.push('var dst=c.l8(' + ea + ');');
                    memCode2.push('var wasZero=((dst&mask)===0);');
                    if (bitOpReg === 1) memCode2.push('dst=(dst^mask)&0xff;');
                    if (bitOpReg === 2) memCode2.push('dst=(dst&(~mask))&0xff;');
                    if (bitOpReg === 3) memCode2.push('dst=(dst|mask)&0xff;');
                    if (bitOpReg !== 0) memCode2.push('c.s8(' + ea + ',dst);');
                    return memCode2.join('');
                },
                1
            );
            return {
                'code': [eaReg.code],
                'out': { 'z': 'wasZero' },
                'pc': eaReg.pc
            };
        }
        
        // ANDI/ORI/EORI to EA
        // ANDI: 00000010ssmmmrrr, ORI: 00000000ssmmmrrr, EORI: 00001010ssmmmrrr
        var immOp = inst & 0xff00;
        if (immOp === 0x0000 || immOp === 0x0200 || immOp === 0x0a00) {
            var immSizeBits = (inst >> 6) & 3;
            if (immSizeBits !== 3) {
                var immSize = 1;
                var immMask = '0xff';
                var immHighBit = '0x80';
                var immKeepMask = '0xffffff00';
                var immValue = this.context.fetch(pc + 2) & 0xff;
                var immExpr = '' + immValue;
                var immNextPc = pc + 4;
                if (immSizeBits === 1) {
                    immSize = 2;
                    immMask = '0xffff';
                    immHighBit = '0x8000';
                    immKeepMask = '0xffff0000';
                    immValue = this.context.fetch(pc + 2) & 0xffff;
                    immExpr = '' + immValue;
                } else if (immSizeBits === 2) {
                    immSize = 4;
                    immMask = '0xffffffff';
                    immHighBit = '0x80000000';
                    immKeepMask = '0x0';
                    immValue = this.context.l32(pc + 2) >>> 0;
                    immExpr = '' + immValue;
                    immNextPc = pc + 6;
                }
                var logicExpr = immOp === 0x0200 ? '(dst&imm)' : immOp === 0x0000 ? '(dst|imm)' : '(dst^imm)';
                var dstMode = (inst >> 3) & 7;
                if (dstMode !== 1) {
                    var immDst = this.effectiveAddressDst(
                        immNextPc, dstMode, inst & 7,
                        function (ea) {
                            if (immSize === 4)
                                return 'var imm=' + immExpr + ';var dst=(' + ea + ')>>>0;var res=(' + logicExpr + ')>>>0;' + ea + '=res>>>0;';
                            return 'var imm=' + immExpr + ';var dst=(' + ea + ')&' + immMask + ';var res=(' + logicExpr + ')&' + immMask + ';' + ea + '=((' + ea + ')&' + immKeepMask + ')|res;';
                        },
                        function (ea) {
                            if (immSize === 1)
                                return 'var imm=' + immExpr + ';var dst=c.l8(' + ea + ');var res=(' + logicExpr + ')&0xff;c.s8(' + ea + ',res);';
                            if (immSize === 2)
                                return 'var imm=' + immExpr + ';var dst=c.l16(' + ea + ');var res=(' + logicExpr + ')&0xffff;c.s16(' + ea + ',res);';
                            return 'var imm=' + immExpr + ';var dst=c.l32(' + ea + ');var res=(' + logicExpr + ')>>>0;c.s32(' + ea + ',res>>>0);';
                        },
                        immSize
                    );
                    return {
                        'code': [immDst.code],
                        'out': { 'n': '((res&' + immHighBit + ')!=0)', 'z': '((res&' + immMask + ')==0)', 'v': '0', 'c': '0' },
                        'pc': immDst.pc
                    };
                }
            }
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
    };
    
    // Line 1: MOVE.b
    j68.prototype.decode1 = function (pc, inst) {
        var dstReg = (inst >> 9) & 7;
        var dstMode = (inst >> 6) & 7;
        var srcInst = inst & 0x1ff;
        var src = this.effectiveAddress(
            pc, srcInst,
            function (ea) { return 'var src=(' + ea + ')&0xff;'; },
            function (ea) { return 'var src=c.l8(' + ea + ')&0xff;'; },
            1
        );

        if (dstMode === 1) {
            return {
                'in': { 'pc': true },
                'code': [ 'c.exception(4,' + pc + ');' ],
                'pc': src.pc,
                'quit': true
            };
        }

        var dst = this.effectiveAddressDst(
            src.pc, dstMode, dstReg,
            function (ea) { return ea + '=(' + ea + '&0xffffff00)|src;'; },
            function (ea) { return 'c.s8(' + ea + ',src);'; },
            1
        );
        return {
            'code': [ src.code, dst.code ],
            'out': this.flagMove('src'),
            'pc': dst.pc
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
                function (ea) { return 'c.a[' + dstReg + ']=c.xw(' + ea + '&0xffff);'; },
                function (ea) { return 'c.a[' + dstReg + ']=c.xw(c.l16(' + ea + ')&0xffff);'; },
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
        if (opmode === 3 || opmode === 7) {
            var size = (inst & 0x100) ? 4 : 2;
            var highBit = '0x80000000';
            var ea = this.effectiveAddress(
                pc, inst,
                function (ea) {
                    if (size === 4) return 'var src=(' + ea + ')>>>0;';
                    return 'var src=c.xw((' + ea + ')&0xffff);';
                },
                function (ea) { 
                    if (size === 4) return 'var src=c.l32(' + ea + ');';
                    return 'var src=c.xw(c.l16(' + ea + '));';
                },
                size
            );
            return {
                'code': [ea.code, 'var dst=c.a[' + r + '];var res=(dst-src)>>>0;'],
                'out': this.flagSub('dst', 'src', 'res', highBit, '0xffffffff'),
                'pc': ea.pc
            };
        }
        // CMP
        if (opmode <= 2) {
            var size = opmode === 0 ? 1 : opmode === 1 ? 2 : 4;
            var sizeMask = size === 1 ? '0xff' : size === 2 ? '0xffff' : '0xffffffff';
            var highBit = size === 1 ? '0x80' : size === 2 ? '0x8000' : '0x80000000';
            var ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return 'var src=(' + ea + ')&' + sizeMask + ';var dst=c.d[' + r + ']&' + sizeMask + ';var res=(dst-src)&' + sizeMask + ';'; },
                function (ea) {
                    if (size === 1) return 'var src=c.l8(' + ea + ');var dst=c.d[' + r + ']&0xff;var res=(dst-src)&0xff;';
                    if (size === 2) return 'var src=c.l16(' + ea + ');var dst=c.d[' + r + ']&0xffff;var res=(dst-src)&0xffff;';
                    return 'var src=c.l32(' + ea + ');var dst=c.d[' + r + '];var res=(dst-src)>>>0;';
                },
                size
            );
            return {
                'code': [ea.code],
                'out': this.flagSub('dst', 'src', 'res', highBit, sizeMask),
                'pc': ea.pc
            };
        }
        // CMPM
        if (opmode >= 4 && opmode <= 6 && ((inst >> 3) & 7) === 1) {
            var size = opmode === 4 ? 1 : opmode === 5 ? 2 : 4;
            var srcReg = inst & 7;
            var sizeMask = size === 1 ? '0xff' : size === 2 ? '0xffff' : '0xffffffff';
            var highBit = size === 1 ? '0x80' : size === 2 ? '0x8000' : '0x80000000';
            var srcStep = (size === 1 && srcReg === 7) ? 2 : size;
            var dstStep = (size === 1 && r === 7) ? 2 : size;
            var loadSrc = size === 1 ? 'var src=c.l8(c.a[' + srcReg + ']);' :
                size === 2 ? 'var src=c.l16(c.a[' + srcReg + ']);' :
                'var src=c.l32(c.a[' + srcReg + ']);';
            var loadDst = size === 1 ? 'var dst=c.l8(c.a[' + r + ']);' :
                size === 2 ? 'var dst=c.l16(c.a[' + r + ']);' :
                'var dst=c.l32(c.a[' + r + ']);';
            return {
                'code': [
                    loadSrc +
                    'c.a[' + srcReg + ']+=' + srcStep + ';' +
                    loadDst +
                    'c.a[' + r + ']+=' + dstStep + ';' +
                    'var res=(dst-src)&' + sizeMask + ';'
                ],
                'out': this.flagSub('dst', 'src', 'res', highBit, sizeMask),
                'pc': pc + 2
            };
        }
        // EOR Dn,<ea>
        if (opmode >= 4 && opmode <= 6) {
            var eorSize = opmode === 4 ? 1 : opmode === 5 ? 2 : 4;
            var eorMask = eorSize === 1 ? '0xff' : eorSize === 2 ? '0xffff' : '0xffffffff';
            var eorHighBit = eorSize === 1 ? '0x80' : eorSize === 2 ? '0x8000' : '0x80000000';
            var eorKeepMask = eorSize === 1 ? '0xffffff00' : eorSize === 2 ? '0xffff0000' : '0x0';
            var eorDst = this.effectiveAddressDst(
                pc + 2, (inst >> 3) & 7, inst & 7,
                function (dstEa) {
                    if (eorSize === 4)
                        return 'var src=c.d[' + r + ']>>>0;var dst=(' + dstEa + ')>>>0;var res=(dst^src)>>>0;' + dstEa + '=res>>>0;';
                    return 'var src=c.d[' + r + ']&' + eorMask + ';var dst=(' + dstEa + ')&' + eorMask + ';var res=(dst^src)&' + eorMask + ';' + dstEa + '=((' + dstEa + ')&' + eorKeepMask + ')|res;';
                },
                function (dstEa) {
                    if (eorSize === 1) return 'var src=c.d[' + r + ']&0xff;var dst=c.l8(' + dstEa + ');var res=(dst^src)&0xff;c.s8(' + dstEa + ',res);';
                    if (eorSize === 2) return 'var src=c.d[' + r + ']&0xffff;var dst=c.l16(' + dstEa + ');var res=(dst^src)&0xffff;c.s16(' + dstEa + ',res);';
                    return 'var src=c.d[' + r + ']>>>0;var dst=c.l32(' + dstEa + ');var res=(dst^src)>>>0;c.s32(' + dstEa + ',res>>>0);';
                },
                eorSize
            );
            return {
                'code': [eorDst.code],
                'out': { 'n': '((res&' + eorHighBit + ')!=0)', 'z': '((res&' + eorMask + ')==0)', 'v': '0', 'c': '0' },
                'pc': eorDst.pc
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
        var r2 = inst & 7;
        // MULS
        if (opmode === 7) {
            var ea = this.effectiveAddress(
                pc, inst,
                function (ea) { return 'c.d[' + r + ']=c.xw((' + ea + ')&0xffff)*c.xw(c.d[' + r + ']&0xffff);'; },
                function (ea) { return 'c.d[' + r + ']=c.xw(c.l16(' + ea + '))*c.xw(c.d[' + r + ']&0xffff);'; },
                2
            );
            return {
                'code': [ea.code],
                'out': this.flagMove('c.d[' + r + ']'),
                'pc': ea.pc
            };
        }
        // MULU
        if (opmode === 3) {
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
        if ((inst & 0xf1f8) === 0xc140) {  // Dn<->Dm
            return { 'code': ['var t=c.d[' + r + '];c.d[' + r + ']=c.d[' + r2 + '];c.d[' + r2 + ']=t;'], 'pc': pc + 2 };
        }
        if ((inst & 0xf1f8) === 0xc148) {  // An<->Am
            return { 'code': ['var t=c.a[' + r + '];c.a[' + r + ']=c.a[' + r2 + '];c.a[' + r2 + ']=t;'], 'pc': pc + 2 };
        }
        if ((inst & 0xf1f8) === 0xc188) {  // Dn<->Am
            return { 'code': ['var t=c.d[' + r + '];c.d[' + r + ']=c.a[' + r2 + '];c.a[' + r2 + ']=t;'], 'pc': pc + 2 };
        }
        // ABCD
        if ((inst & 0xf1f0) === 0xc100 || (inst & 0xf1f0) === 0xc108) {
            return { 'code': ['/* ABCD */'], 'pc': pc + 2 };
        }
        if (opmode <= 2 || (opmode >= 4 && opmode <= 6)) {
            var andSize = opmode === 0 || opmode === 4 ? 1 : opmode === 1 || opmode === 5 ? 2 : 4;
            var andMask = andSize === 1 ? '0xff' : andSize === 2 ? '0xffff' : '0xffffffff';
            var andHighBit = andSize === 1 ? '0x80' : andSize === 2 ? '0x8000' : '0x80000000';
            var andKeepMask = andSize === 1 ? '0xffffff00' : andSize === 2 ? '0xffff0000' : '0x0';
            if (opmode <= 2) {  // AND <ea>,Dn
                var andEa = this.effectiveAddress(
                    pc, inst,
                    function (srcEa) {
                        if (andSize === 4)
                            return 'var src=(' + srcEa + ')>>>0;var dst=c.d[' + r + ']>>>0;var res=(dst&src)>>>0;c.d[' + r + ']=res>>>0;';
                        return 'var src=(' + srcEa + ')&' + andMask + ';var dst=c.d[' + r + ']&' + andMask + ';var res=(dst&src)&' + andMask + ';c.d[' + r + ']=(c.d[' + r + ']&' + andKeepMask + ')|res;';
                    },
                    function (srcEa) {
                        if (andSize === 1) return 'var src=c.l8(' + srcEa + ');var dst=c.d[' + r + ']&0xff;var res=(dst&src)&0xff;c.d[' + r + ']=(c.d[' + r + ']&0xffffff00)|res;';
                        if (andSize === 2) return 'var src=c.l16(' + srcEa + ');var dst=c.d[' + r + ']&0xffff;var res=(dst&src)&0xffff;c.d[' + r + ']=(c.d[' + r + ']&0xffff0000)|res;';
                        return 'var src=c.l32(' + srcEa + ');var dst=c.d[' + r + ']>>>0;var res=(dst&src)>>>0;c.d[' + r + ']=res>>>0;';
                    },
                    andSize
                );
                return {
                    'code': [andEa.code],
                    'out': { 'n': '((res&' + andHighBit + ')!=0)', 'z': '((res&' + andMask + ')==0)', 'v': '0', 'c': '0' },
                    'pc': andEa.pc
                };
            }
            var andDst = this.effectiveAddressDst(
                pc + 2, (inst >> 3) & 7, inst & 7,
                function (dstEa) {
                    if (andSize === 4)
                        return 'var src=c.d[' + r + ']>>>0;var dst=(' + dstEa + ')>>>0;var res=(dst&src)>>>0;' + dstEa + '=res>>>0;';
                    return 'var src=c.d[' + r + ']&' + andMask + ';var dst=(' + dstEa + ')&' + andMask + ';var res=(dst&src)&' + andMask + ';' + dstEa + '=((' + dstEa + ')&' + andKeepMask + ')|res;';
                },
                function (dstEa) {
                    if (andSize === 1) return 'var src=c.d[' + r + ']&0xff;var dst=c.l8(' + dstEa + ');var res=(dst&src)&0xff;c.s8(' + dstEa + ',res);';
                    if (andSize === 2) return 'var src=c.d[' + r + ']&0xffff;var dst=c.l16(' + dstEa + ');var res=(dst&src)&0xffff;c.s16(' + dstEa + ',res);';
                    return 'var src=c.d[' + r + ']>>>0;var dst=c.l32(' + dstEa + ');var res=(dst&src)>>>0;c.s32(' + dstEa + ',res>>>0);';
                },
                andSize
            );
            return {
                'code': [andDst.code],
                'out': { 'n': '((res&' + andHighBit + ')!=0)', 'z': '((res&' + andMask + ')==0)', 'v': '0', 'c': '0' },
                'pc': andDst.pc
            };
        }
        // Default AND
        this.log('not impl: line=C, opmode=' + opmode.toString(16));
        throw console.assert(false);
    };
    
    // Line E: Shift/Rotate
    j68.prototype.decodeE = function (pc, inst) {
        // Bit field instructions (MC68020+)
        if ((inst & 0x08c0) === 0x08c0) {
            if (this.type < j68.TYPE_MC68020) {
                return {
                    'code': [ 'c.exception(4,' + pc + ');' ],
                    'pc': pc + 2,
                    'quit': true
                };
            }
            var op = (inst >> 8) & 0xf;
            var ext = this.context.fetch(pc + 2);
            var dstReg = (ext >> 12) & 7;
            var offsetExpr = (ext & 0x0800) ? '(c.d[' + ((ext >> 6) & 7) + ']|0)' : String((ext >> 6) & 0x1f);
            var widthExpr = (ext & 0x0020) ? 'c.bitFieldWidth(c.d[' + (ext & 7) + '])' : String(this.context.bitFieldWidth(ext & 0x1f));
            var bfEa = this.bitFieldEa(pc + 2, inst);
            var code = [
                'var bfOffset=' + offsetExpr + ';',
                'var bfWidth=' + widthExpr + ';'
            ];
            if (bfEa.kind === 'reg') {
                code.push('var bfValue=c.d[' + bfEa.index + ']>>>0;');
                code.push('var bfField=c.bitFieldReadReg(bfValue,bfOffset,bfWidth);');
            } else {
                code.push('var bfEa=' + bfEa.ea + ';');
                code.push('var bfField=c.bitFieldReadMem(bfEa,bfOffset,bfWidth);');
            }
            code.push('c.cn=((bfField>>>(bfWidth-1))&1)!==0;');
            code.push('c.cz=(bfField===0);');
            code.push('c.cv=0;');
            code.push('c.cc=0;');

            switch (op) {
                case 0x8: // BFTST
                    break;
                case 0xA: // BFCHG
                    code.push('var bfNew=(bfField^(bfWidth===32?0xffffffff:((1<<bfWidth)-1)))>>>0;');
                    if (bfEa.kind === 'reg')
                        code.push('c.d[' + bfEa.index + ']=c.bitFieldWriteReg(bfValue,bfOffset,bfWidth,bfNew);');
                    else
                        code.push('c.bitFieldWriteMem(bfEa,bfOffset,bfWidth,bfNew);');
                    break;
                case 0xC: // BFCLR
                    if (bfEa.kind === 'reg')
                        code.push('c.d[' + bfEa.index + ']=c.bitFieldWriteReg(bfValue,bfOffset,bfWidth,0);');
                    else
                        code.push('c.bitFieldWriteMem(bfEa,bfOffset,bfWidth,0);');
                    break;
                case 0xE: // BFSET
                    code.push('var bfSetValue=(bfWidth===32?0xffffffff:((1<<bfWidth)-1))>>>0;');
                    if (bfEa.kind === 'reg')
                        code.push('c.d[' + bfEa.index + ']=c.bitFieldWriteReg(bfValue,bfOffset,bfWidth,bfSetValue);');
                    else
                        code.push('c.bitFieldWriteMem(bfEa,bfOffset,bfWidth,bfSetValue);');
                    break;
                case 0x9: // BFEXTU
                    code.push('c.d[' + dstReg + ']=bfField>>>0;');
                    break;
                case 0xB: // BFEXTS
                    code.push('c.d[' + dstReg + ']=c.bitFieldSignExtend(bfField,bfWidth);');
                    break;
                case 0xD: // BFFFO
                    code.push('c.d[' + dstReg + ']=((bfOffset+c.bitFieldFindFirstOne(bfField,bfWidth))|0)>>>0;');
                    break;
                case 0xF: // BFINS
                    code.push('var bfInsert=c.bitFieldInsertValue(c.d[' + dstReg + '],bfWidth);');
                    code.push('c.cn=((bfInsert>>>(bfWidth-1))&1)!==0;');
                    code.push('c.cz=(bfInsert===0);');
                    if (bfEa.kind === 'reg')
                        code.push('c.d[' + bfEa.index + ']=c.bitFieldWriteReg(bfValue,bfOffset,bfWidth,bfInsert);');
                    else
                        code.push('c.bitFieldWriteMem(bfEa,bfOffset,bfWidth,bfInsert);');
                    break;
                default:
                    break;
            }
            return {
                'code': code,
                'out': { 'n': 'c.cn', 'z': 'c.cz', 'v': 'c.cv', 'c': 'c.cc' },
                'pc': bfEa.pc
            };
        }

        var r = inst & 7;
        var dir = (inst >> 8) & 1;
        var arith = (inst >> 11) & 1;
        var rotate = (inst >> 10) & 1;
        var count = (inst >> 9) & 7;
        if (count === 0) count = 8;
        
        // Memory shifts/rotates: one-bit word operation on memory EA.
        if (((inst >> 6) & 3) === 3) {
            var memShiftType = (inst >> 8) & 3;
            var memEa = this.effectiveAddress(
                pc, inst,
                function (ea) { return 'throw console.assert(false);'; },
                function (ea) {
                    switch (memShiftType) {
                        case 0:  // ASR
                            return 'var dst=c.l16(' + ea + ');var carry=((dst&0x0001)!==0);var res=((dst>>1)|(dst&0x8000))&0xffff;c.s16(' + ea + ',res);var overflow=false;';
                        case 1:  // ASL
                            return 'var dst=c.l16(' + ea + ');var carry=((dst&0x8000)!==0);var res=(dst<<1)&0xffff;c.s16(' + ea + ',res);var overflow=(((dst^res)&0x8000)!==0);';
                        case 2:  // LSR
                            return 'var dst=c.l16(' + ea + ');var carry=((dst&0x0001)!==0);var res=(dst>>>1)&0x7fff;c.s16(' + ea + ',res);var overflow=false;';
                        case 3:  // LSL
                            return 'var dst=c.l16(' + ea + ');var carry=((dst&0x8000)!==0);var res=(dst<<1)&0xffff;c.s16(' + ea + ',res);var overflow=false;';
                    }
                    return 'throw console.assert(false);';
                },
                2
            );
            switch (memShiftType) {
                case 0:
                case 1:
                case 2:
                case 3:
                    return {
                        'code': [memEa.code],
                        'out': {
                            'x': 'carry',
                            'n': '((res&0x8000)!==0)',
                            'z': '(res===0)',
                            'v': 'overflow',
                            'c': 'carry'
                        },
                        'pc': memEa.pc
                    };
                default:
                    this.log('not impl: line=E memory rotate');
                    throw console.assert(false);
            }
        }
        
        var shiftType = (dir << 2) | (arith << 1) | rotate;
        var code = [];
        switch (shiftType) {
            case 0:  // ASL
                code.push('c.d[' + r + ']<<=' + count + ';');
                break;
            case 1:  // ASR
                code.push('c.d[' + r + ']=c.xw(c.d[' + r + ']>>' + count + ');');
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
                code.push('/* ROXL D' + r + ' */');
                break;
            case 7:  // ROXR
                code.push('/* ROXR D' + r + ' */');
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