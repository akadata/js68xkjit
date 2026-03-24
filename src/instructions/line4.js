var movemInstruction = require('./movem');
var nbcdInstruction = require('./nbcd');

exports.decode = function (cpu, pc, inst) {
    var r = (inst >> 9) & 7;
    var op = (inst >> 6) & 7;
    var mode = (inst >> 3) & 7;
    var reg = inst & 7;
    var ea;
    var size;
    var sizeBytes;
    var sizeMask;
    var highBit;
    var keepMask;
    var rtdDisp;
    var movecExt;
    var movecIsAddr;
    var movecReg;
    var movecCr;
    var movecRegRef;
    var movecRead = null;
    var movecWrite = null;
    var data;
    var vec;
    var disp;
    var chkCode;

    if (inst === 0x4e71) {
        return { 'code': [], 'pc': pc + 2 };
    }

    if (inst === 0x4e75) {
        return {
            'code': ['c.pc=c.l32(c.a[7]);c.a[7]+=4;'],
            'pc': pc + 2,
            'quit': true
        };
    }

    if (inst === 0x4e77) {
        return {
            'in': { 'pc': true },
            'code': ['var ccr=c.l16(c.a[7]);c.a[7]+=2;c.setCcr(ccr&0xff);c.pc=c.l32(c.a[7]);c.a[7]+=4;'],
            'pc': pc + 2,
            'quit': true
        };
    }

    if (inst === 0x4e73) {
        return {
            'in': { 'pc': true, 'sr': true },
            'code': ['if((c.sr&0x2000)===0){c.exception(8,' + pc + ');}else{c.setSr(c.l16(c.a[7]));c.a[7]+=2;c.pc=c.l32(c.a[7]);c.a[7]+=4;}'],
            'pc': pc + 2,
            'quit': true
        };
    }

    if (inst === 0x4e74) {
        rtdDisp = cpu.context.fetch(pc + 2);
        return {
            'in': { 'pc': true },
            'code': ['c.pc=c.l32(c.a[7]);c.a[7]=(c.a[7]+4+' + cpu.extS16U32(rtdDisp) + ')>>>0;'],
            'pc': pc + 4,
            'quit': true
        };
    }

    if (inst === 0x4e70) {
        return { 'code': ['/* RESET */'], 'pc': pc + 2 };
    }

    if (inst === 0x4e7a || inst === 0x4e7b) {
        movecExt = cpu.context.fetch(pc + 2);
        movecIsAddr = (movecExt & 0x8000) !== 0;
        movecReg = (movecExt >> 12) & 7;
        movecCr = movecExt & 0x0fff;
        movecRegRef = (movecIsAddr ? 'c.a[' : 'c.d[') + movecReg + ']';
        switch (movecCr) {
            case 0x000: 
                movecRead = '(c.sfc>>>0)'; movecWrite = 'c.sfc=(src&7);';
            break;
            case 0x001: 
                movecRead = '(c.dfc>>>0)'; movecWrite = 'c.dfc=(src&7);'; 
            break;
            case 0x002: 
                movecRead = '(c.cacr>>>0)'; movecWrite = 'c.cacr=(src>>>0);'; 
            break;
            case 0x800: 
                movecRead = '(c.usp>>>0)'; movecWrite = 'c.usp=(src>>>0);'; 
            break;
            case 0x801: 
                movecRead = '(c.vbr>>>0)'; movecWrite = 'c.vbr=(src>>>0);'; 
            break;
            case 0x802: 
                movecRead = '(c.caar>>>0)'; movecWrite = 'c.caar=(src>>>0);';
            break;
            case 0x803: 
                movecRead = '(c.msp>>>0)'; movecWrite = 'c.msp=(src>>>0);'; 
            break;
            case 0x804: 
                movecRead = '(c.isp>>>0)'; movecWrite = 'c.isp=(src>>>0);'; 
            break;
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

    if (inst === 0x4e72) {
        data = cpu.context.fetch(pc + 2);
        return {
            'in': { 'pc': true, 'sr': true },
            'code': ['if((c.sr&0x2000)===0){c.exception(8,' + pc + ');}else{c.setSr(' + data + ');c.pc=' + (pc + 4) + ';c.halt=true;}'],
            'pc': pc + 4,
            'quit': true
        };
    }

    if (inst === 0x4afc) {
        return {
            'in': { 'pc': true },
            'code': ['c.f(0x10);'],
            'pc': pc + 2,
            'quit': true
        };
    }

    if ((inst & 0xfff8) === 0x4848) {
        return { 'code': ['/* BKPT */'], 'pc': pc + 2 };
    }

    if (op === 7) {
        ea = cpu.effectiveAddress(
            pc, inst,
            function (srcEa) { 
                return 'c.a[' + r + ']=' + srcEa + ';'; 
            },
            function (srcEa) { 
                return 'c.a[' + r + ']=' + srcEa + ';'; 
            },
            4
        );
        return { 
            'code': [ea.code], 'pc': ea.pc 
        };
    }

    if (op === 1 && r === 4 && mode >= 2) {
        ea = cpu.effectiveAddress(
            pc, inst,
            function () { 
                return ''; 
            },
            function () { 
                return ''; 
            },
            4
        );
        return {
            'code': ['c.a[7]-=4;c.s32(c.a[7],' + ea.pc + ');'],
            'pc': pc + 2
        };
    }

    if ((inst & 0xff00) === 0x4200) {
        size = (inst >> 6) & 3;
        if (size !== 3) {
            sizeBytes = size === 0 ? 1 : size === 1 ? 2 : 4;
            ea = cpu.effectiveAddress(
                pc, inst,
                function (dstEa) { 
                    return dstEa + '=0;'; 
                },
                function (dstEa) {
                    if (sizeBytes === 1) {
                        return 'c.s8(' + dstEa + ',0);';
                    }
                    if (sizeBytes === 2) {
                        return 'c.s16(' + dstEa + ',0);';
                    }
                    return 'c.s32(' + dstEa + ',0);';
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

    if ((inst & 0xff00) === 0x4600) {
        size = (inst >> 6) & 3;
        if (size !== 3) {
            sizeBytes = size === 0 ? 1 : size === 1 ? 2 : 4;
            sizeMask = size === 0 ? '0xff' : size === 1 ? '0xffff' : '0xffffffff';
            highBit = size === 0 ? '0x80' : size === 1 ? '0x8000' : '0x80000000';
            keepMask = size === 0 ? '0xffffff00' : size === 1 ? '0xffff0000' : '0x0';
            ea = cpu.effectiveAddress(
                pc, inst,
                function (dstEa) {
                    if (sizeBytes === 4) {
                        return 'var dst=(' + dstEa + ')&(' + sizeMask + ');var res=(~dst)&(' + sizeMask + ');' + dstEa + '=res>>>0;';
                    }
                    return 'var dst=(' + dstEa + ')&(' + sizeMask + ');var res=(~dst)&(' + sizeMask + ');' + dstEa + '=((' + dstEa + ')&' + keepMask + ')|res;';
                },
                function (dstEa) {
                    if (sizeBytes === 1) {
                        return 'var dst=c.l8(' + dstEa + ');var res=(~dst)&0xff;c.s8(' + dstEa + ',res);';
                    }
                    if (sizeBytes === 2) {
                        return 'var dst=c.l16(' + dstEa + ');var res=(~dst)&0xffff;c.s16(' + dstEa + ',res);';
                    }
                    return 'var dst=c.l32(' + dstEa + ');var res=(~dst)>>>0;c.s32(' + dstEa + ',res);';
                },
                sizeBytes
            );
            return {
                'code': [ea.code],
                'out': { 'n': '((res&' + highBit + ')!=0)', 'z': '(res==0)', 'v': '0', 'c': '0' },
                'pc': ea.pc
            };
        }
    }

    if ((inst & 0xff00) === 0x4400) {
        size = (inst >> 6) & 3;
        if (size !== 3) {
            sizeBytes = size === 0 ? 1 : size === 1 ? 2 : 4;
            sizeMask = size === 0 ? '0xff' : size === 1 ? '0xffff' : '0xffffffff';
            highBit = size === 0 ? '0x80' : size === 1 ? '0x8000' : '0x80000000';
            ea = cpu.effectiveAddress(
                pc, inst,
                function (dstEa) { 
                    return 'var dst=(' + dstEa + ')&(' + sizeMask + ');var res=(-dst)&(' + sizeMask + ');' + dstEa + '=res;'; 
                },
                function (dstEa) {
                    if (sizeBytes === 1) {
                        return 'var dst=c.l8(' + dstEa + ');var res=(-dst)&0xff;c.s8(' + dstEa + ',res);';
                    }
                    if (sizeBytes === 2) {
                        return 'var dst=c.l16(' + dstEa + ');var res=(-dst)&0xffff;c.s16(' + dstEa + ',res);';
                    }
                    return 'var dst=c.l32(' + dstEa + ');var res=(-dst)>>>0;c.s32(' + dstEa + ',res);';
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

    if ((inst & 0xff00) === 0x4000) {
        size = (inst >> 6) & 3;
        if (size !== 3) {
            sizeBytes = size === 0 ? 1 : size === 1 ? 2 : 4;
            sizeMask = size === 0 ? '0xff' : size === 1 ? '0xffff' : '0xffffffff';
            highBit = size === 0 ? '0x80' : size === 1 ? '0x8000' : '0x80000000';
            ea = cpu.effectiveAddress(
                pc, inst,
                function (dstEa) {
                    return 'var oldZ=c.cz;var dst=(' + dstEa + ')&' + sizeMask + ';var x=(c.cx?1:0);var srcx=(dst+x)&' + sizeMask + ';var ext=dst+x;var res=(0-ext)&' + sizeMask + ';' + dstEa + '=res;';
                },
                function (dstEa) {
                    if (sizeBytes === 1) {
                        return 'var oldZ=c.cz;var dst=c.l8(' + dstEa + ');var x=(c.cx?1:0);var srcx=(dst+x)&0xff;var ext=dst+x;var res=(0-ext)&0xff;c.s8(' + dstEa + ',res);';
                    }
                    if (sizeBytes === 2) {
                        return 'var oldZ=c.cz;var dst=c.l16(' + dstEa + ');var x=(c.cx?1:0);var srcx=(dst+x)&0xffff;var ext=dst+x;var res=(0-ext)&0xffff;c.s16(' + dstEa + ',res);';
                    }
                    return 'var oldZ=c.cz;var dst=c.l32(' + dstEa + ');var x=(c.cx?1:0);var srcx=(dst+x)>>>0;var ext=(dst>>>0)+x;var res=(0-ext)>>>0;c.s32(' + dstEa + ',res>>>0);';
                },
                sizeBytes
            );
            return {
                'in': { 'x': true, 'z': true },
                'code': [ea.code],
                'out': {
                    'x': '(ext!==0)',
                    'n': '((res&' + highBit + ')!=0)',
                    'z': '(oldZ&&((res&' + sizeMask + ')==0))',
                    'v': '(((0&' + highBit + ')!=(srcx&' + highBit + '))&&((res&' + highBit + ')!=(0&' + highBit + ')))',
                    'c': '(ext!==0)'
                },
                'pc': ea.pc
            };
        }
    }

    if ((inst & 0xff00) === 0x4a00) {
        size = (inst >> 6) & 3;
        if (size !== 3) {
            sizeBytes = size === 0 ? 1 : size === 1 ? 2 : 4;
            sizeMask = size === 0 ? '0xff' : size === 1 ? '0xffff' : '0xffffffff';
            highBit = size === 0 ? '0x80' : size === 1 ? '0x8000' : '0x80000000';
            ea = cpu.effectiveAddress(
                pc, inst,
                function (srcEa) { 
                    return 'var t=(' + srcEa + ')&' + sizeMask + ';'; 
                },
                function (srcEa) {
                    if (sizeBytes === 1) {
                        return 'var t=c.l8(' + srcEa + ')&0xff;';
                    }
                    if (sizeBytes === 2) {
                        return 'var t=c.l16(' + srcEa + ')&0xffff;';
                    }
                    return 'var t=c.l32(' + srcEa + ');';
                },
                sizeBytes
            );
            return {
                'code': [ea.code],
                'out': { 'n': '((t&' + highBit + ')!=0)', 'z': '(t==0)', 'v': '0', 'c': '0' },
                'pc': ea.pc
            };
        }
    }

    if ((inst & 0xffc0) === 0x4ac0) {
        ea = cpu.effectiveAddress(
            pc, inst,
            function (dstEa) { 
                return 'var t=(' + dstEa + ')&0xff;c.cz=(t==0);c.cn=((t&0x80)!==0);' + dstEa + '=((' + dstEa + ')&0xffffff00)|(t|0x80);'; 
            },
            function (dstEa) { 
                return 'var t=c.l8(' + dstEa + ');c.cz=(t==0);c.cn=(t>>7)&1;c.s8(' + dstEa + ',t|0x80);'; 
            },
            1
        );
        return {
            'code': [ea.code],
            'out': { 'n': 'c.cn', 'z': 'c.cz', 'v': '0', 'c': '0' },
            'pc': ea.pc
        };
    }

    if ((inst & 0xfff8) === 0x4880) {
        return {
            'code': ['c.d[' + reg + ']=c.xw(c.d[' + reg + ']&0xff);'],
            'out': cpu.flagMove('c.d[' + reg + ']'),
            'pc': pc + 2
        };
    }

    if ((inst & 0xfff8) === 0x48c0) {
        return {
            'code': ['c.d[' + reg + ']=c.xw(c.d[' + reg + ']&0xffff);'],
            'out': cpu.flagMove('c.d[' + reg + ']'),
            'pc': pc + 2
        };
    }

    if ((inst & 0xfff8) === 0x4840) {
        return {
            'code': ['var t=c.d[' + reg + '];c.d[' + reg + ']=((t&0xffff)<<16)|((t>>16)&0xffff);'],
            'out': cpu.flagMove('c.d[' + reg + ']'),
            'pc': pc + 2
        };
    }

    if ((inst & 0xfff8) === 0x4e50) {
        disp = cpu.context.fetch(pc + 2);
        return {
            'code': ['c.a[7]-=4;c.s32(c.a[7],c.a[' + r + ']);c.a[' + r + ']=c.a[7];c.a[7]+=' + cpu.extS16U32(disp) + ';'],
            'pc': pc + 4
        };
    }

    if ((inst & 0xfff8) === 0x4e58) {
        return {
            'code': ['c.a[7]=c.a[' + r + '];c.a[' + r + ']=c.l32(c.a[7]);c.a[7]+=4;'],
            'pc': pc + 2
        };
    }

    if (inst === 0x46d8 || (op === 1 && r === 3 && mode === 2)) {
        return { 
            'code': ['c.setSr(c.l16(c.a[7]));c.a[7]+=2;'], 'pc': pc + 2 
        };
    }

    if ((inst & 0xffc0) === 0x40c0) {
        ea = cpu.effectiveAddress(
            pc, inst,
            function (dstEa) { 
                return dstEa + '=(c.sr&0xffff);'; 
            },
            function (dstEa) { 
                return 'c.s16(' + dstEa + ',c.sr&0xffff);'; 
            },
            2
        );
        return {
            'in': { 'sr': true },
            'code': [ea.code],
            'pc': ea.pc
        };
    }

    if ((inst & 0xffc0) === 0x42c0) {
        ea = cpu.effectiveAddress(
            pc, inst,
            function (dstEa) { 
                return dstEa + '=(c.sr&0x1f);'; 
            },
            function (dstEa) { 
                return 'c.s16(' + dstEa + ',c.sr&0x1f);'; 
            },
            2
        );
        return {
            'in': { 'sr': true },
            'code': [ea.code],
            'pc': ea.pc
        };
    }

    if ((inst & 0xffc0) === 0x44c0) {
        ea = cpu.effectiveAddress(
            pc, inst,
            function (srcEa) { 
                return 'c.setCcr(' + srcEa + '&0xff);'; 
            },
            function (srcEa) { 
                return 'c.setCcr(c.l16(' + srcEa + ')&0xff);'; 
            },
            2
        );
        return {
            'code': [ea.code],
            'pc': ea.pc
        };
    }

    if ((inst & 0xffc0) === 0x46c0) {
        ea = cpu.effectiveAddress(
            pc, inst,
            function (srcEa) { 
                return 'c.setSr(' + srcEa + '&0xffff);'; 
            },
            function (srcEa) { 
                return 'c.setSr(c.l16(' + srcEa + '));'; 
            },
            2
        );
        return {
            'code': [ea.code],
            'pc': ea.pc
        };
    }

    if ((inst & 0xfff8) === 0x4e60)
        return { 
            'code': ['c.usp=c.a[' + r + '];'], 'pc': pc + 2 
        };

    if ((inst & 0xfff8) === 0x4e68)
        return { 
            'code': ['c.a[' + r + ']=c.usp;'], 'pc': pc + 2 
        };

    if ((inst & 0xfff0) === 0x4e40) {
        vec = inst & 0xf;
        return {
            'in': { 'pc': true },
            'code': ['c.f(' + (0xa000 + vec) + ');'],
            'pc': pc + 2,
            'quit': true
        };
    }

    if (inst === 0x4e76) {
        return {
            'in': { 'pc': true, 'v': true },
            'code': ['if(c.cv){c.f(0x1c);}'],
            'pc': pc + 2
        };
    }

    if ((inst & 0xf1c0) === 0x4180) {
        ea = cpu.effectiveAddress(
            pc, inst,
            function (srcEa) { 
                return 'var upper=c.xw((' + srcEa + ')&0xffff);'; 
            },
            function (srcEa) { 
                return 'var upper=c.xw(c.l16(' + srcEa + '));'; 
            },
            2
        );
        chkCode = [];
        chkCode.push(ea.code);
        chkCode.push('var value=c.xw(c.d[' + r + ']&0xffff);');
        chkCode.push('c.cz=0;c.cv=0;c.cc=0;');
        chkCode.push('if(value<0){c.cn=1;c.exception(6,' + pc + ');}');
        chkCode.push('else if(value>upper){c.cn=0;c.exception(6,' + pc + ');}');
        return {
            'in': { 'pc': true, 'x': true, 'n': true },
            'code': chkCode,
            'pc': ea.pc,
            'quit': true
        };
    }

    if (((inst & 0xff80) === 0x4880 || (inst & 0xff80) === 0x4c80) && mode >= 2) {
        return movemInstruction.decode(cpu, pc, inst);
    }

    if ((inst & 0xffc0) === 0x4800) {
        return nbcdInstruction.decode(cpu, pc, inst);
    }

    if ((inst & 0xffc0) === 0x4ec0) {
        ea = cpu.effectiveAddress(
            pc, inst,
            function (target) { 
                return 'c.pc=' + target + ';'; 
            },
            function (target) { 
                return 'c.pc=' + target + ';'; 
            },
            4
        );
        return { 
            'code': [ea.code], 'pc': pc + 2, 'quit': true 
        };
    }

    if ((inst & 0xffc0) === 0x4e80) {
        ea = cpu.effectiveAddress(
            pc, inst,
            function () { 
                return ''; 
            },
            function () { 
                return ''; 
            },
            4
        );
        return {
            'code': ['c.a[7]-=4;c.s32(c.a[7],' + (pc + 2) + ');' + ea.code],
            'pc': pc + 2,
            'quit': true
        };
    }

    cpu.log('not impl: line=4, op=' + op + ', r=' + r + ', mode=' + mode + ', inst=' + inst.toString(16));
    throw console.assert(false);
};
