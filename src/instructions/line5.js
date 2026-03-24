exports.decode = function (cpu, pc, inst) {
    var data = (inst >> 9) & 7;
    var size = (inst >> 6) & 3;
    var mode = (inst >> 3) & 7;
    var r = inst & 7;
    var cond = (inst >> 8) & 0xf;
    var condCode = '';
    var trapNextPc;
    var sizeMask = '0xffffffff';
    var highBit = '0x80000000';
    var isSub;
    var sccEa;
    var disp;
    var branchTarget;
    var fallThrough;
    var code;
    var eaDst;
    var keepMask = '0x0';

    if (data === 0)
        data = 8;

    switch (cond) {
        case 0: 
            condCode = 'true'; 
        break;
        case 1: 
            condCode = 'false'; 
        break;
        case 2: 
            condCode = '(!c.cc&&!c.cz)'; 
        break;
        case 3: 
            condCode = '(c.cc||c.cz)'; 
        break;
        case 4: 
            condCode = '!c.cc'; 
        break;
        case 5: 
            condCode = 'c.cc'; 
        break;
        case 6: 
            condCode = '!c.cz'; 
        break;
        case 7: 
            condCode = 'c.cz'; 
        break;
        case 8: 
            condCode = '!c.cv'; 
        break;
        case 9: 
            condCode = 'c.cv'; 
        break;
        case 10: 
            condCode = '!c.cn'; 
        break;
        case 11: 
            condCode = 'c.cn'; 
        break;
        case 12: 
            condCode = '(c.cn===c.cv)'; 
        break;
        case 13: 
            condCode = '(c.cn!==c.cv)'; 
        break;
        case 14: 
            condCode = '(!c.cz&&(c.cn===c.cv))'; 
        break;
        case 15: 
            condCode = '(c.cz||(c.cn!==c.cv))'; 
        break;
    }

    if ((inst & 0x00f8) === 0x00f8 && (r === 2 || r === 3 || r === 4)) {
        if (cpu.type < cpu.constructor.TYPE_MC68020) {
            return {
                'code': [ 'c.exception(4,' + pc + ');' ],
                'pc': pc + 2,
                'quit': true
            };
        }
        trapNextPc = pc + 2;
        if (r === 2) {
            trapNextPc = pc + 4;
        }
        else if (r === 3) {
            trapNextPc = pc + 6;
        }
        return {
            'in': { 'pc': true, 'n': true, 'z': true, 'v': true, 'c': true },
            'code': [ 'if(' + condCode + '){c.exception(7,' + trapNextPc + ');}else{c.pc=' + trapNextPc + ';}' ],
            'pc': trapNextPc,
            'quit': true
        };
    }

    if (size === 0) {
        sizeMask = '0xff';
        highBit = '0x80';
        keepMask = '0xffffff00';
    } else if (size === 1) {
        sizeMask = '0xffff';
        highBit = '0x8000';
        keepMask = '0xffff0000';
    }

    isSub = ((inst >> 8) & 1) === 1;

    if (size === 3 && mode !== 1) {
        sccEa = cpu.effectiveAddress(
            pc,
            inst,
            function (dstEa) { 
                return dstEa + '=((' + dstEa + ')&0xffffff00)|((' + condCode + ')?0xff:0x00);'; 
            },
            function (dstEa) { 
                return 'c.s8(' + dstEa + ',(' + condCode + ')?0xff:0x00);'; 
            },
            1
        );
        return {
            'in': { 'n': true, 'z': true, 'v': true, 'c': true },
            'code': [ sccEa.code ],
            'pc': sccEa.pc
        };
    }

    if (mode === 1 && size === 3) {
        disp = cpu.context.fetch(pc + 2);
        branchTarget = cpu.addU32S16(pc + 2, disp);
        fallThrough = pc + 4;
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

    if (mode === 1) {
        if (size === 0) {
            return {
                'code': [ 'c.exception(4,' + pc + ');' ],
                'pc': pc + 2,
                'quit': true
            };
        }
        return {
            'code': [
                'c.a[' + r + ']=((c.a[' + r + ']' + (isSub ? '-' : '+') + data + '))>>>0;'
            ],
            'pc': pc + 2
        };
    }

    if (mode === 0) {
        code = [];
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
        }
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

    if (size === 0 || size === 1 || size === 2) {
        eaDst = cpu.effectiveAddressDst(
            pc + 2, mode, r,
            function (dstEa) {
                if (size === 2) {
                    if (isSub) {
                        return 'var src=' + data + ';var dst=(' + dstEa + ')>>>0;var res=(dst-src)>>>0;' + dstEa + '=res>>>0;';
                    }
                    return 'var src=' + data + ';var dst=(' + dstEa + ')>>>0;var res=(dst+src)>>>0;' + dstEa + '=res>>>0;';
                }
                if (isSub) {
                    return 'var src=' + data + ';var dst=(' + dstEa + ')&' + sizeMask + ';var res=(dst-src)&' + sizeMask + ';' + dstEa + '=((' + dstEa + ')&' + keepMask + ')|res;';
                }
                return 'var src=' + data + ';var dst=(' + dstEa + ')&' + sizeMask + ';var res=(dst+src)&' + sizeMask + ';' + dstEa + '=((' + dstEa + ')&' + keepMask + ')|res;';
            },
            function (dstEa) {
                if (size === 0) {
                    if (isSub) {
                        return 'var src=' + data + ';var dst=c.l8(' + dstEa + ');var res=(dst-src)&0xff;c.s8(' + dstEa + ',res);';
                    }
                    return 'var src=' + data + ';var dst=c.l8(' + dstEa + ');var res=(dst+src)&0xff;c.s8(' + dstEa + ',res);';
                }
                if (size === 1) {
                    if (isSub) {
                        return 'var src=' + data + ';var dst=c.l16(' + dstEa + ');var res=(dst-src)&0xffff;c.s16(' + dstEa + ',res);';
                    }
                    return 'var src=' + data + ';var dst=c.l16(' + dstEa + ');var res=(dst+src)&0xffff;c.s16(' + dstEa + ',res);';
                }
                if (isSub) {
                    return 'var src=' + data + ';var dst=c.l32(' + dstEa + ')>>>0;var res=(dst-src)>>>0;c.s32(' + dstEa + ',res>>>0);';
                }
                return 'var src=' + data + ';var dst=c.l32(' + dstEa + ')>>>0;var res=(dst+src)>>>0;c.s32(' + dstEa + ',res>>>0);';
            },
            size === 0 ? 1 : size === 1 ? 2 : 4
        );
        return {
            'code': [ eaDst.code ],
            'out': {
                'n': '((res&' + highBit + ')!=0)',
                'z': '((res&' + sizeMask + ')==0)',
                'v': isSub ?
                    '(((dst&' + highBit + ')!=(src&' + highBit + '))&&((res&' + highBit + ')!=(dst&' + highBit + ')))' :
                    '(((dst&' + highBit + ')==(src&' + highBit + '))&&((res&' + highBit + ')!=(dst&' + highBit + ')))',
                'c': isSub ?
                    (size === 2 ? '((dst>>>0)<(src>>>0))' : '((dst&' + sizeMask + ')<(src&' + sizeMask + '))') :
                    (size === 2 ? '((res>>>0)<(dst>>>0))' : '((res&' + sizeMask + ')<(dst&' + sizeMask + '))'),
                'x': isSub ?
                    (size === 2 ? '((dst>>>0)<(src>>>0))' : '((dst&' + sizeMask + ')<(src&' + sizeMask + '))') :
                    (size === 2 ? '((res>>>0)<(dst>>>0))' : '((res&' + sizeMask + ')<(dst&' + sizeMask + '))')
            },
            'pc': eaDst.pc
        };
    }

    cpu.log('ADDQ/SUBQ not impl mode: ' + mode);
    throw console.assert(false);
};