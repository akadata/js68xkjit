function reverseMask16(mask) {
    var reversed = 0;
    var i;

    for (i = 0; i < 16; ++i) {
        if (mask & (1 << i))
            reversed |= (1 << (15 - i));
    }
    return reversed & 0xffff;
}

function resolveEa(cpu, pc, mode, reg, load) {
    var disp;
    var ext;

    switch (mode) {
        case 2:
            return { expr: 'c.a[' + reg + ']>>>0', pc: pc };
        case 3:
            if (!load)
                throw new Error('MOVEM register-to-memory does not support postincrement destination');
            return { expr: 'c.a[' + reg + ']>>>0', pc: pc, postincrement: true, reg: reg };
        case 4:
            if (load)
                throw new Error('MOVEM memory-to-register does not support predecrement source');
            return { expr: 'c.a[' + reg + ']>>>0', pc: pc, predecrement: true, reg: reg };
        case 5:
            disp = cpu.context.fetch(pc);
            return { expr: '(c.a[' + reg + ']+' + cpu.extS16U32(disp) + ')>>>0', pc: pc + 2 };
        case 6:
            return cpu.indexedEaInfo(pc, 'c.a[' + reg + ']');
        case 7:
            switch (reg) {
                case 0:
                    return { expr: '' + cpu.extS16U32(cpu.context.fetch(pc)), pc: pc + 2 };
                case 1:
                    return { expr: '' + (cpu.context.l32(pc) >>> 0), pc: pc + 4 };
                case 2:
                    disp = cpu.context.fetch(pc);
                    return { expr: '' + cpu.addU32S16(pc, disp), pc: pc + 2 };
                case 3:
                    return cpu.indexedEaInfo(pc, '' + pc);
            }
            break;
    }
    throw new Error('unsupported MOVEM addressing mode mode=' + mode + ' reg=' + reg);
}

exports.decode = function (cpu, pc, inst) {
    var mode = (inst >> 3) & 7;
    var reg = inst & 7;
    var mask = cpu.context.fetch(pc + 2) & 0xffff;
    var size = (inst & 0x40) ? 4 : 2;
    var load = (inst & 0x0400) !== 0;
    var ea = resolveEa(cpu, pc + 4, mode, reg, load);
    var code = [];

    code.push('var movemAddr=(' + ea.expr + ')>>>0;');
    if (load) {
        code.push('var movemNext=c.movemLoad(movemAddr,' + mask + ',' + size + ');');
        if (ea.postincrement)
            code.push('c.a[' + ea.reg + ']=movemNext>>>0;');
    } else {
        if (ea.predecrement)
            mask = reverseMask16(mask);
        code.push('var movemNext=c.movemStore(movemAddr,' + mask + ',' + size + ',' + (ea.predecrement ? 'true' : 'false') + ');');
        if (ea.predecrement)
            code.push('c.a[' + ea.reg + ']=movemNext>>>0;');
    }

    return {
        'code': code,
        'pc': ea.pc
    };
};
