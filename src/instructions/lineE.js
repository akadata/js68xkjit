var shiftRotateInstruction = require('./shift_rotate');

exports.decode = function (cpu, pc, inst) {
    if ((inst & 0x08c0) === 0x08c0) {
        if (cpu.type < cpu.constructor.TYPE_MC68020) {
            return {
                'code': [ 'c.exception(4,' + pc + ');' ],
                'pc': pc + 2,
                'quit': true
            };
        }
        var op = (inst >> 8) & 0xf;
        var ext = cpu.context.fetch(pc + 2);
        var dstReg = (ext >> 12) & 7;
        var offsetExpr = (ext & 0x0800) ? '(c.d[' + ((ext >> 6) & 7) + ']|0)' : String((ext >> 6) & 0x1f);
        var widthExpr = (ext & 0x0020) ? 'c.bitFieldWidth(c.d[' + (ext & 7) + '])' : String(cpu.context.bitFieldWidth(ext & 0x1f));
        var bfEa = cpu.bitFieldEa(pc + 4, inst);
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
            case 0x8:
                break;
            case 0xA:
                code.push('var bfNew=(bfField^(bfWidth===32?0xffffffff:((1<<bfWidth)-1)))>>>0;');
                if (bfEa.kind === 'reg') {
                    code.push('c.d[' + bfEa.index + ']=c.bitFieldWriteReg(bfValue,bfOffset,bfWidth,bfNew);');
                } else {
                    code.push('c.bitFieldWriteMem(bfEa,bfOffset,bfWidth,bfNew);');
                }
                break;
            case 0xC:
                if (bfEa.kind === 'reg') {
                    code.push('c.d[' + bfEa.index + ']=c.bitFieldWriteReg(bfValue,bfOffset,bfWidth,0);');
                } else {
                    code.push('c.bitFieldWriteMem(bfEa,bfOffset,bfWidth,0);');
                }
                break;
            case 0xE:
                code.push('var bfSetValue=(bfWidth===32?0xffffffff:((1<<bfWidth)-1))>>>0;');
                if (bfEa.kind === 'reg') {
                    code.push('c.d[' + bfEa.index + ']=c.bitFieldWriteReg(bfValue,bfOffset,bfWidth,bfSetValue);');
                } else {
                    code.push('c.bitFieldWriteMem(bfEa,bfOffset,bfWidth,bfSetValue);');
                }
                break;
            case 0x9:
                code.push('c.d[' + dstReg + ']=bfField>>>0;');
                break;
            case 0xB:
                code.push('c.d[' + dstReg + ']=c.bitFieldSignExtend(bfField,bfWidth);');
                break;
            case 0xD:
                code.push('c.d[' + dstReg + ']=((bfOffset+c.bitFieldFindFirstOne(bfField,bfWidth))|0)>>>0;');
                break;
            case 0xF:
                code.push('var bfInsert=c.bitFieldInsertValue(c.d[' + dstReg + '],bfWidth);');
                code.push('c.cn=((bfInsert>>>(bfWidth-1))&1)!==0;');
                code.push('c.cz=(bfInsert===0);');
                if (bfEa.kind === 'reg') {
                    code.push('c.d[' + bfEa.index + ']=c.bitFieldWriteReg(bfValue,bfOffset,bfWidth,bfInsert);');
                } else {
                    code.push('c.bitFieldWriteMem(bfEa,bfOffset,bfWidth,bfInsert);');
                }
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

    return shiftRotateInstruction.decode(cpu, pc, inst);
};