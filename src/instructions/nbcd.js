exports.decode = function (cpu, pc, inst) {
    var ea = cpu.effectiveAddress(
        pc,
        inst,
        function (target) {
            return 'var oldZ=c.cz;var dst=(' + target + ')&0xff;var res=c.bcdSub(0,dst,c.cx);' + target + '=((' + target + ')&0xffffff00)|res;c.cz=oldZ&&c.cz;';
        },
        function (target) {
            return 'var oldZ=c.cz;var dst=c.l8(' + target + ');var res=c.bcdSub(0,dst,c.cx);c.s8(' + target + ',res);c.cz=oldZ&&c.cz;';
        },
        1
    );
    return {
        'in': { 'x': true, 'z': true },
        'code': [ea.code],
        'out': { 'x': 'c.cx', 'n': 'c.cn', 'z': 'c.cz', 'v': 'c.cv', 'c': 'c.cc' },
        'pc': ea.pc
    };
};
