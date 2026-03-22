function s8(value) {
    value &= 0xff;
    return value & 0x80 ? value - 0x100 : value;
}

function s16(value) {
    value &= 0xffff;
    return value & 0x8000 ? value - 0x10000 : value;
}

function hex(value, width) {
    return (Array(width + 1).join('0') + ((value >>> 0).toString(16).toUpperCase())).slice(-width);
}

function hex8(value) {
    return '$' + hex(value, 8);
}

function hex4(value) {
    return '$' + hex(value, 4);
}

function formatDisp16(baseReg, disp) {
    return hex4(disp & 0xffff) + '(A' + baseReg + ')';
}

function formatBranchTarget(pc, disp, size) {
    return '$' + hex((pc + size + disp) >>> 0, 8);
}

function disassembleOne(machine, address) {
    var pc = address >>> 0;
    var inst = machine.cpu.context.fetch(pc);
    var line = (inst >> 12) & 0xf;
    var dstReg = (inst >> 9) & 7;
    var dstMode = (inst >> 6) & 7;
    var srcMode = (inst >> 3) & 7;
    var srcReg = inst & 7;

    if (inst === 0x4e71)
        return { next: pc + 2, text: 'NOP' };
    if (inst === 0x4e73)
        return { next: pc + 2, text: 'RTE' };
    if (inst === 0x4e75)
        return { next: pc + 2, text: 'RTS' };
    if ((inst & 0xfff0) === 0x4e40)
        return { next: pc + 2, text: 'TRAP #' + (inst & 0xf) };
    if (inst === 0x46fc)
        return { next: pc + 4, text: 'MOVE.W #' + hex4(machine.cpu.context.fetch(pc + 2)) + ',SR' };
    if (inst === 0xa000)
        return { next: pc + 2, text: 'MONITOR' };

    if (line === 1) {
        if (dstMode === 2 && srcMode === 0) {
            return {
                next: pc + 2,
                text: 'MOVE.B D' + srcReg + ',(A' + dstReg + ')'
            };
        }
    }

    if (line === 2) {
        if (dstMode === 1 && srcMode === 7 && srcReg === 4) {
            return {
                next: pc + 6,
                text: 'MOVEA.L #' + hex8(machine.cpu.context.l32(pc + 2)) + ',A' + dstReg
            };
        }
        if (dstMode === 0 && srcMode === 7 && srcReg === 4) {
            return {
                next: pc + 6,
                text: 'MOVE.L #' + hex8(machine.cpu.context.l32(pc + 2)) + ',D' + dstReg
            };
        }
        if (dstMode === 2 && srcMode === 0) {
            return {
                next: pc + 2,
                text: 'MOVE.L D' + srcReg + ',(A' + dstReg + ')'
            };
        }
        if (dstMode === 5 && srcMode === 0) {
            return {
                next: pc + 4,
                text: 'MOVE.L D' + srcReg + ',' + formatDisp16(dstReg, machine.cpu.context.fetch(pc + 2))
            };
        }
        if (dstMode === 0 && srcMode === 2) {
            return {
                next: pc + 2,
                text: 'MOVE.L (A' + srcReg + '),D' + dstReg
            };
        }
    }

    if (line === 5 && dstMode === 2 && srcMode === 0) {
        var quick = dstReg === 0 ? 8 : dstReg;
        if ((inst & 0x0100) === 0) {
            return {
                next: pc + 2,
                text: 'ADDQ.L #' + quick + ',D' + srcReg
            };
        }
    }

    if ((inst & 0xf1c0) === 0x5040) {
        return {
            next: pc + 2,
            text: 'ADDQ.W #' + (((inst >> 9) & 7) || 8) + ',D' + (inst & 7)
        };
    }

    if ((inst & 0xf1c0) === 0x5000) {
        return {
            next: pc + 2,
            text: 'ADDQ.B #' + (((inst >> 9) & 7) || 8) + ',D' + (inst & 7)
        };
    }

    if (line === 6) {
        var cond = (inst >> 8) & 0xf;
        var disp8 = s8(inst & 0xff);
        if ((inst & 0xff) === 0x00) {
            var disp16 = s16(machine.cpu.context.fetch(pc + 2));
            if (cond === 0)
                return { next: pc + 4, text: 'BRA.W ' + formatBranchTarget(pc, disp16, 2) };
            if (cond === 1)
                return { next: pc + 4, text: 'BSR.W ' + formatBranchTarget(pc, disp16, 2) };
            if (cond === 6)
                return { next: pc + 4, text: 'BNE.W ' + formatBranchTarget(pc, disp16, 2) };
            if (cond === 7)
                return { next: pc + 4, text: 'BEQ.W ' + formatBranchTarget(pc, disp16, 2) };
        } else {
            if (cond === 0)
                return { next: pc + 2, text: 'BRA.S ' + formatBranchTarget(pc, disp8, 2) };
            if (cond === 1)
                return { next: pc + 2, text: 'BSR.S ' + formatBranchTarget(pc, disp8, 2) };
            if (cond === 6)
                return { next: pc + 2, text: 'BNE.S ' + formatBranchTarget(pc, disp8, 2) };
            if (cond === 7)
                return { next: pc + 2, text: 'BEQ.S ' + formatBranchTarget(pc, disp8, 2) };
        }
    }

    if (line === 7 && ((inst >> 8) & 1) === 0) {
        var imm = inst & 0xff;
        var signed = imm & 0x80 ? imm - 0x100 : imm;
        return {
            next: pc + 2,
            text: 'MOVEQ #' + signed + ',D' + dstReg
        };
    }

    if ((inst & 0xffc0) === 0x0c40) {
        return {
            next: pc + 4,
            text: 'CMPI.W #' + hex4(machine.cpu.context.fetch(pc + 2)) + ',D' + (inst & 7)
        };
    }

    if ((inst & 0xffc0) === 0x0c00) {
        return {
            next: pc + 4,
            text: 'CMPI.B #' + hex4(machine.cpu.context.fetch(pc + 2) & 0xff) + ',D' + (inst & 7)
        };
    }

    return {
        next: pc + 2,
        text: 'DC.W ' + hex4(inst)
    };
}

function disassemble(machine, address, count) {
    var lines = [];
    var pc = address >>> 0;
    var limit = count === undefined ? 5 : count | 0;
    for (var i = 0; i < limit; ++i) {
        var decoded = disassembleOne(machine, pc);
        lines.push(hex(pc, 8) + ': ' + decoded.text);
        pc = decoded.next >>> 0;
    }
    return lines.join('\n');
}

module.exports = {
    disassemble: disassemble,
    disassembleOne: disassembleOne
};
