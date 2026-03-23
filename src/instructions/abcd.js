function byteStep(reg) {
    return reg === 7 ? 2 : 1;
}

exports.decode = function (cpu, pc, inst) {
    var dstReg = (inst >> 9) & 7;
    var srcReg = inst & 7;
    var memMode = (inst & 0x8) !== 0;
    var code = [];

    if (memMode) {
        code.push('c.a[' + srcReg + ']-=' + byteStep(srcReg) + ';');
        code.push('c.a[' + dstReg + ']-=' + byteStep(dstReg) + ';');
        code.push('var oldZ=c.cz;');
        code.push('var src=c.l8(c.a[' + srcReg + ']);');
        code.push('var dst=c.l8(c.a[' + dstReg + ']);');
        code.push('var res=c.bcdAdd(dst,src,c.cx);');
        code.push('c.s8(c.a[' + dstReg + '],res);');
        code.push('c.cz=oldZ&&c.cz;');
    } else {
        code.push('var oldZ=c.cz;');
        code.push('var src=c.d[' + srcReg + ']&0xff;');
        code.push('var dst=c.d[' + dstReg + ']&0xff;');
        code.push('var res=c.bcdAdd(dst,src,c.cx);');
        code.push('c.d[' + dstReg + ']=(c.d[' + dstReg + ']&0xffffff00)|res;');
        code.push('c.cz=oldZ&&c.cz;');
    }

    return {
        'in': { 'x': true, 'z': true },
        'code': code,
        'out': { 'x': 'c.cx', 'n': 'c.cn', 'z': 'c.cz', 'v': 'c.cv', 'c': 'c.cc' },
        'pc': pc + 2
    };
};
