exports.decode = function (cpu, pc, inst) {
    var r = (inst >> 9) & 7;
    var opmode = (inst >> 6) & 7;
    var code = [];
    var ea;
    var out;
    var srcReg;
    var memMode;
    var srcStep;
    var dstStep;
    var packAdj;
    var packSrc;
    var packDst;
    var unpkAdj;
    var unpkSrc;
    var unpkDst;
    var logicSize;
    var logicMask;
    var logicHighBit;
    var logicKeepMask;
    var orDst;

    if ((inst & 0xf1f8) === 0x8100 || (inst & 0xf1f8) === 0x8108) {
        srcReg = inst & 7;
        memMode = (inst & 0x8) !== 0;
        if (memMode) {
            srcStep = srcReg === 7 ? 2 : 1;
            dstStep = r === 7 ? 2 : 1;
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
        case 3:
            ea = cpu.effectiveAddress(
                pc, inst,
                function (srcEa) { return 'c.d[' + r + ']=c.divu(' + srcEa + ',c.d[' + r + ']);'; },
                function (srcEa) { return 'c.d[' + r + ']=c.divu(c.l16(' + srcEa + '),c.d[' + r + ']);'; },
                2
            );
            code.push(ea.code);
            out = { 'n': 'c.t[0]&8', 'z': 'c.t[0]&4', 'v': 'c.t[0]&2', 'c': false };
            return { 'code': code, 'out': out, 'pc': ea.pc };
        case 7:
            ea = cpu.effectiveAddress(
                pc, inst,
                function (srcEa) { return 'c.d[' + r + ']=c.divs(' + srcEa + ',c.d[' + r + ']);'; },
                function (srcEa) { return 'c.d[' + r + ']=c.divs(c.l16(' + srcEa + '),c.d[' + r + ']);'; },
                2
            );
            code.push(ea.code);
            out = { 'n': 'c.t[0]&8', 'z': 'c.t[0]&4', 'v': 'c.t[0]&2', 'c': false };
            return { 'code': code, 'out': out, 'pc': ea.pc };
        case 5:
            if ((inst & 0xf1f0) === 0x8140 || (inst & 0xf1f0) === 0x8148) {
                packAdj = cpu.context.fetch(pc + 2);
                if ((inst & 0x8) !== 0) {
                    packSrc = inst & 7;
                    packDst = r;
                    return {
                        'code': [
                            'c.a[' + packSrc + ']-=2;',
                            'c.a[' + packDst + ']-=1;',
                            'var src=((c.l8(c.a[' + packSrc + '])&0x0f)<<8)|(c.l8(c.a[' + packSrc + ']+1)&0x0f);',
                            'var tmp=(src+' + cpu.extS16U32(packAdj) + ')&0xffff;',
                            'var result=((tmp>>8)&0xf0)|(tmp&0x0f);',
                            'c.s8(c.a[' + packDst + '],result);'
                        ],
                        'pc': pc + 4
                    };
                }
                return {
                    'code': [
                        'var src=c.d[' + (inst & 7) + ']&0xffff;',
                        'var tmp=(src+' + cpu.extS16U32(packAdj) + ')&0xffff;',
                        'var result=((tmp>>8)&0xf0)|(tmp&0x0f);',
                        'c.d[' + r + ']=(c.d[' + r + ']&0xffffff00)|result;'
                    ],
                    'pc': pc + 4
                };
            }
            break;
        case 6:
            if ((inst & 0xf1f0) === 0x8180 || (inst & 0xf1f0) === 0x8188) {
                unpkAdj = cpu.context.fetch(pc + 2);
                if ((inst & 0x8) !== 0) {
                    unpkSrc = inst & 7;
                    unpkDst = r;
                    return {
                        'code': [
                            'c.a[' + unpkSrc + ']-=1;',
                            'c.a[' + unpkDst + ']-=2;',
                            'var src=c.l8(c.a[' + unpkSrc + ']);',
                            'var tmp=((((src&0xf0)<<4)|(src&0x0f))+' + cpu.extS16U32(unpkAdj) + ')&0xffff;',
                            'c.s8(c.a[' + unpkDst + '],(tmp>>8)&0xff);',
                            'c.s8(c.a[' + unpkDst + ']+1,tmp&0xff);'
                        ],
                        'pc': pc + 4
                    };
                }
                return {
                    'code': [
                        'var src=c.d[' + (inst & 7) + ']&0xff;',
                        'var tmp=((((src&0xf0)<<4)|(src&0x0f))+' + cpu.extS16U32(unpkAdj) + ')&0xffff;',
                        'c.d[' + r + ']=(c.d[' + r + ']&0xffff0000)|tmp;'
                    ],
                    'pc': pc + 4
                };
            }
            break;
    }

    if (opmode <= 2 || (opmode >= 4 && opmode <= 6)) {
        logicSize = opmode === 0 || opmode === 4 ? 1 : opmode === 1 || opmode === 5 ? 2 : 4;
        logicMask = logicSize === 1 ? '0xff' : logicSize === 2 ? '0xffff' : '0xffffffff';
        logicHighBit = logicSize === 1 ? '0x80' : logicSize === 2 ? '0x8000' : '0x80000000';
        logicKeepMask = logicSize === 1 ? '0xffffff00' : logicSize === 2 ? '0xffff0000' : '0x0';
        if (opmode <= 2) {
            ea = cpu.effectiveAddress(
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
        orDst = cpu.effectiveAddressDst(
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

    cpu.log('line 8 not impl opmode: ' + opmode);
    throw console.assert(false);
};
