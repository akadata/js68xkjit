function sizeInfo(sizeCode) {
    switch (sizeCode) {
        case 0:
            return { 
                size: 1, keepMask: '0xffffff00', mask: '0xff' 
        };
        case 1:
            return { 
                size: 2, keepMask: '0xffff0000', mask: '0xffff' 
        };
        case 2:
            return { 
                size: 4, keepMask: '0x00000000', mask: '0xffffffff' 
        };
    }
    throw new Error('invalid shift/rotate size');
}

function decodeMemory(cpu, pc, inst) {
    var op = (inst >> 8) & 7;
    var kind;
    var left;
    var ea;

    switch (op) {
        case 0: 
            kind = 'as'; left = false; 
        break;
        case 1: 
            kind = 'as'; left = true; 
        break;
        case 2: 
            kind = 'ls'; left = false; 
        break;
        case 3: 
            kind = 'ls'; left = true; 
        break;
        case 4: 
            kind = 'rox'; left = false; 
        break;
        case 5: 
            kind = 'rox'; left = true; 
        break;
        case 6: 
            kind = 'ro'; left = false; 
        break;
        case 7: 
            kind = 'ro'; left = true; 
        break;
        default:
            throw new Error('invalid memory shift/rotate op');
    }

    ea = cpu.effectiveAddress(
        pc,
        inst,
        function () { return 'throw console.assert(false);'; },
        function (target) {
            return 'var shiftAddr=(' + target + ')>>>0;var shiftRes=c.shiftRotate(' + JSON.stringify(kind) + ',' + (left ? 'true' : 'false') + ',2,1,c.l16(shiftAddr));c.s16(shiftAddr,shiftRes);';
        },
        2
    );

    return {
        'in': kind === 'rox' ? { 'x': true } : undefined,
        'code': [ea.code],
        'out': { 'x': 'c.cx', 'n': 'c.cn', 'z': 'c.cz', 'v': 'c.cv', 'c': 'c.cc' },
        'pc': ea.pc
    };
}

exports.decode = function (cpu, pc, inst) {
    var sizeCode = (inst >> 6) & 3;
    var reg = inst & 7;
    var op = (inst >> 3) & 3;
    var left = (inst & 0x0100) !== 0;
    var useRegisterCount = (inst & 0x20) !== 0;
    var info;
    var kind;
    var countExpr;
    var code = [];
    var input;

    if (sizeCode === 3) {
        return decodeMemory(cpu, pc, inst);
    }

    info = sizeInfo(sizeCode);
    switch (op) {
        case 0: kind = 'as'; break;
        case 1: kind = 'ls'; break;
        case 2: kind = 'rox'; break;
        case 3: kind = 'ro'; break;
    }

    if (useRegisterCount) {
        countExpr = '(c.d[' + ((inst >> 9) & 7) + ']&63)';
    } else {
        countExpr = (inst >> 9) & 7;
        if (countExpr === 0) {
            countExpr = 8;
        }
        countExpr = '' + countExpr;
    }

    code.push('var shiftValue=c.d[' + reg + ']>>>0;');
    code.push('var shiftRes=c.shiftRotate(' + JSON.stringify(kind) + ',' + (left ? 'true' : 'false') + ',' + info.size + ',' + countExpr + ',shiftValue);');
    if (info.size === 4) {
        code.push('c.d[' + reg + ']=shiftRes>>>0;');
    } else {
        code.push('c.d[' + reg + ']=(c.d[' + reg + ']&' + info.keepMask + ')|(shiftRes&' + info.mask + ');');
    }

    if (kind === 'rox') {
        input = { 'x': true };
    }

    return {
        'in': input,
        'code': code,
        'out': { 'x': 'c.cx', 'n': 'c.cn', 'z': 'c.cz', 'v': 'c.cv', 'c': 'c.cc' },
        'pc': pc + 2
    };
};