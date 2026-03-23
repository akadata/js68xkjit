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

function formatImm(value, size) {
    if (size === 'b')
        return '#$' + hex(value & 0xff, 2);
    if (size === 'w')
        return '#$' + hex(value & 0xffff, 4);
    return '#$' + hex(value >>> 0, 8);
}

function formatRegisterMask(mask) {
    var parts = [];
    var i;
    var runStart = -1;
    var runEnd = -1;
    var kind = '';

    function flush() {
        if (runStart < 0)
            return;
        if (runStart === runEnd)
            parts.push(kind + runStart);
        else
            parts.push(kind + runStart + '-' + kind + runEnd);
        runStart = -1;
        runEnd = -1;
    }

    function feed(prefix, index) {
        if (runStart < 0) {
            kind = prefix;
            runStart = index;
            runEnd = index;
            return;
        }
        if (kind === prefix && runEnd + 1 === index) {
            runEnd = index;
            return;
        }
        flush();
        kind = prefix;
        runStart = index;
        runEnd = index;
    }

    for (i = 0; i < 8; ++i) {
        if (mask & (1 << i))
            feed('d', i);
    }
    flush();
    for (i = 0; i < 8; ++i) {
        if (mask & (1 << (i + 8)))
            feed('a', i);
    }
    flush();
    return parts.join('/');
}

function formatIndexed(base, ext) {
    var disp = s8(ext & 0xff);
    var indexKind = (ext & 0x8000) ? 'A' : 'D';
    var indexReg = (ext >> 12) & 7;
    var indexSize = (ext & 0x0800) ? '.L' : '.W';
    return '$' + hex(disp & 0xff, 2) + '(' + base + ',' + indexKind + indexReg + indexSize + ')';
}

function formatEa(machine, pc, mode, reg, size) {
    var ext;
    var value;

    switch (mode) {
        case 0: return { text: 'D' + reg, next: pc };
        case 1: return { text: 'A' + reg, next: pc };
        case 2: return { text: '(A' + reg + ')', next: pc };
        case 3: return { text: '(A' + reg + ')+', next: pc };
        case 4: return { text: '-(A' + reg + ')', next: pc };
        case 5:
            ext = machine.cpu.context.fetch(pc);
            return { text: formatDisp16(reg, ext), next: pc + 2 };
        case 6:
            ext = machine.cpu.context.fetch(pc);
            return { text: formatIndexed('A' + reg, ext), next: pc + 2 };
        case 7:
            switch (reg) {
                case 0:
                    value = machine.cpu.context.fetch(pc);
                    return { text: hex4(value), next: pc + 2 };
                case 1:
                    value = machine.cpu.context.l32(pc);
                    return { text: hex8(value), next: pc + 4 };
                case 2:
                    ext = machine.cpu.context.fetch(pc);
                    return { text: '$' + hex(ext & 0xffff, 4) + '(PC)', next: pc + 2 };
                case 3:
                    ext = machine.cpu.context.fetch(pc);
                    return { text: formatIndexed('PC', ext), next: pc + 2 };
                case 4:
                    if (size === 'b')
                        return { text: formatImm(machine.cpu.context.fetch(pc) & 0xff, 'b'), next: pc + 2 };
                    if (size === 'w')
                        return { text: formatImm(machine.cpu.context.fetch(pc), 'w'), next: pc + 2 };
                    value = machine.cpu.context.l32(pc);
                    return { text: formatImm(value, 'l'), next: pc + 4 };
            }
            break;
    }
    return null;
}

function disassembleOne(machine, address) {
    var pc = address >>> 0;
    var inst = machine.cpu.context.fetch(pc);
    var line = (inst >> 12) & 0xf;
    var dstReg = (inst >> 9) & 7;
    var dstMode = (inst >> 6) & 7;
    var srcMode = (inst >> 3) & 7;
    var srcReg = inst & 7;
    var ea;
    var size;
    var opmode;
    var nextPc;
    var bitName;
    var bitPc;
    var bitSrc;
    var mask;
    var condNames;
    var moveSrc;
    var moveDst;

    if (inst === 0x4e71)
        return { next: pc + 2, text: 'NOP' };
    if (inst === 0x4e70)
        return { next: pc + 2, text: 'RESET' };
    if (inst === 0x4e73)
        return { next: pc + 2, text: 'RTE' };
    if (inst === 0x4e75)
        return { next: pc + 2, text: 'RTS' };
    if (inst === 0x4e76)
        return { next: pc + 2, text: 'TRAPV' };
    if (inst === 0x4e77)
        return { next: pc + 2, text: 'RTR' };
    if (inst === 0x4e72)
        return { next: pc + 4, text: 'STOP ' + formatImm(machine.cpu.context.fetch(pc + 2), 'w') };
    if ((inst & 0xfff0) === 0x4e40)
        return { next: pc + 2, text: 'TRAP #' + (inst & 0xf) };
    if (inst === 0x4afc)
        return { next: pc + 2, text: 'ILLEGAL' };
    if (inst === 0x003c || inst === 0x023c || inst === 0x0a3c)
        return { next: pc + 4, text: ({ 0x003c: 'ORI', 0x023c: 'ANDI', 0x0a3c: 'EORI' }[inst]) + ' ' + formatImm(machine.cpu.context.fetch(pc + 2), 'b') + ',CCR' };
    if (inst === 0x007c || inst === 0x027c || inst === 0x0a7c)
        return { next: pc + 4, text: ({ 0x007c: 'ORI', 0x027c: 'ANDI', 0x0a7c: 'EORI' }[inst]) + ' ' + formatImm(machine.cpu.context.fetch(pc + 2), 'w') + ',SR' };
    if (inst === 0x46fc)
        return { next: pc + 4, text: 'MOVE.W #' + hex4(machine.cpu.context.fetch(pc + 2)) + ',SR' };
    if (inst === 0xa000)
        return { next: pc + 2, text: 'MONITOR' };
    if ((inst & 0xfff8) === 0x4e58)
        return { next: pc + 2, text: 'UNLK A' + (inst & 7) };
    if ((inst & 0xfff8) === 0x4e50)
        return { next: pc + 4, text: 'LINK A' + (inst & 7) + ',' + formatImm(machine.cpu.context.fetch(pc + 2), 'w') };
    if ((inst & 0xfff8) === 0x4e68)
        return { next: pc + 2, text: 'MOVE USP,A' + (inst & 7) };
    if ((inst & 0xfff8) === 0x4e60)
        return { next: pc + 2, text: 'MOVE A' + (inst & 7) + ',USP' };
    if ((inst & 0xfff8) === 0x4880)
        return { next: pc + 2, text: 'EXT.W D' + (inst & 7) };
    if ((inst & 0xfff8) === 0x48c0)
        return { next: pc + 2, text: 'EXT.L D' + (inst & 7) };
    if ((inst & 0xf1f8) === 0x4840)
        return { next: pc + 2, text: 'SWAP D' + (inst & 7) };
    if ((inst & 0xf1f8) === 0xc140)
        return { next: pc + 2, text: 'EXG D' + ((inst >> 9) & 7) + ',D' + (inst & 7) };
    if ((inst & 0xf1f8) === 0xc148)
        return { next: pc + 2, text: 'EXG A' + ((inst >> 9) & 7) + ',A' + (inst & 7) };
    if ((inst & 0xf1f8) === 0xc188)
        return { next: pc + 2, text: 'EXG D' + ((inst >> 9) & 7) + ',A' + (inst & 7) };
    if ((inst & 0xf1f8) === 0xc100)
        return { next: pc + 2, text: 'ABCD D' + (inst & 7) + ',D' + ((inst >> 9) & 7) };
    if ((inst & 0xf1f8) === 0xc108)
        return { next: pc + 2, text: 'ABCD -(A' + (inst & 7) + '),-(A' + ((inst >> 9) & 7) + ')' };
    if ((inst & 0xf1f8) === 0x8100)
        return { next: pc + 2, text: 'SBCD D' + (inst & 7) + ',D' + ((inst >> 9) & 7) };
    if ((inst & 0xf1f8) === 0x8108)
        return { next: pc + 2, text: 'SBCD -(A' + (inst & 7) + '),-(A' + ((inst >> 9) & 7) + ')' };
    if ((inst & 0xfff8) === 0x4800)
        return { next: pc + 2, text: 'NBCD D' + (inst & 7) };
    if ((inst & 0xf130) === 0xd100) {
        var addxSize = [ 'B', 'W', 'L' ][(inst >> 6) & 3];
        if (addxSize)
            return { next: pc + 2, text: 'ADDX.' + addxSize + ' D' + (inst & 7) + ',D' + ((inst >> 9) & 7) };
    }
    if ((inst & 0xf138) === 0xd108) {
        var addxMemSize = [ 'B', 'W', 'L' ][(inst >> 6) & 3];
        if (addxMemSize)
            return { next: pc + 2, text: 'ADDX.' + addxMemSize + ' -(A' + (inst & 7) + '),-(A' + ((inst >> 9) & 7) + ')' };
    }
    if ((inst & 0xf130) === 0x9100) {
        size = [ 'B', 'W', 'L' ][(inst >> 6) & 3];
        if (size)
            return { next: pc + 2, text: 'SUBX.' + size + ' D' + (inst & 7) + ',D' + ((inst >> 9) & 7) };
    }
    if ((inst & 0xf138) === 0x9108) {
        size = [ 'B', 'W', 'L' ][(inst >> 6) & 3];
        if (size)
            return { next: pc + 2, text: 'SUBX.' + size + ' -(A' + (inst & 7) + '),-(A' + ((inst >> 9) & 7) + ')' };
    }
    if ((inst & 0xf138) === 0xb108) {
        size = [ 'B', 'W', 'L' ][(inst >> 6) & 3];
        if (size)
            return { next: pc + 2, text: 'CMPM.' + size + ' (A' + (inst & 7) + ')+,(A' + ((inst >> 9) & 7) + ')+' };
    }

    if (line === 1) {
        moveSrc = formatEa(machine, pc + 2, srcMode, srcReg, 'b');
        if (moveSrc) {
            moveDst = formatEa(machine, moveSrc.next, dstMode, dstReg, 'b');
            if (moveDst)
                return { next: moveDst.next, text: 'MOVE.B ' + moveSrc.text + ',' + moveDst.text };
        }
    }

    if (line === 2) {
        moveSrc = formatEa(machine, pc + 2, srcMode, srcReg, 'l');
        if (moveSrc) {
            if (dstMode === 1)
                return { next: moveSrc.next, text: 'MOVEA.L ' + moveSrc.text + ',A' + dstReg };
            moveDst = formatEa(machine, moveSrc.next, dstMode, dstReg, 'l');
            if (moveDst)
                return { next: moveDst.next, text: 'MOVE.L ' + moveSrc.text + ',' + moveDst.text };
        }
    }

    if (line === 3) {
        moveSrc = formatEa(machine, pc + 2, srcMode, srcReg, 'w');
        if (moveSrc) {
            if (dstMode === 1)
                return { next: moveSrc.next, text: 'MOVEA.W ' + moveSrc.text + ',A' + dstReg };
            moveDst = formatEa(machine, moveSrc.next, dstMode, dstReg, 'w');
            if (moveDst)
                return { next: moveDst.next, text: 'MOVE.W ' + moveSrc.text + ',' + moveDst.text };
        }
    }

    if ((inst & 0xf0f8) === 0x50c8) {
        return {
            next: pc + 4,
            text: 'DBRA D' + (inst & 7) + ',' + formatBranchTarget(pc, s16(machine.cpu.context.fetch(pc + 2)), 2)
        };
    }

    if ((inst & 0xf100) === 0x5000) {
        size = [ 'B', 'W', 'L' ][(inst >> 6) & 3];
        ea = formatEa(machine, pc + 2, (inst >> 3) & 7, inst & 7, size ? size.toLowerCase() : 'w');
        if (size && ea)
            return { next: ea.next, text: (((inst & 0x0100) !== 0) ? 'SUBQ' : 'ADDQ') + '.' + size + ' #' + (((inst >> 9) & 7) || 8) + ',' + ea.text };
    }

    if ((inst & 0xf0c0) === 0x50c0) {
        condNames = [ 'ST', 'SF', 'SHI', 'SLS', 'SCC', 'SCS', 'SNE', 'SEQ', 'SVC', 'SVS', 'SPL', 'SMI', 'SGE', 'SLT', 'SGT', 'SLE' ];
        ea = formatEa(machine, pc + 2, (inst >> 3) & 7, inst & 7, 'b');
        if (ea)
            return { next: ea.next, text: condNames[(inst >> 8) & 0xf] + ' ' + ea.text };
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

    if ((inst & 0xf100) === 0x0000 || (inst & 0xf100) === 0x0200 || (inst & 0xf100) === 0x0400 || (inst & 0xf100) === 0x0600 || (inst & 0xf100) === 0x0a00 || (inst & 0xf100) === 0x0c00) {
        var immNames = { 0x0000: 'ORI', 0x0200: 'ANDI', 0x0400: 'SUBI', 0x0600: 'ADDI', 0x0a00: 'EORI', 0x0c00: 'CMPI' };
        var immName = immNames[inst & 0x0f00];
        size = [ 'B', 'W', 'L' ][(inst >> 6) & 3];
        if (immName && size) {
            nextPc = pc + 2;
            imm = size === 'L' ? machine.cpu.context.l32(nextPc) : machine.cpu.context.fetch(nextPc);
            nextPc += size === 'L' ? 4 : 2;
            ea = formatEa(machine, nextPc, srcMode, srcReg, size.toLowerCase());
            if (ea)
                return { next: ea.next, text: immName + '.' + size + ' ' + formatImm(imm, size.toLowerCase()) + ',' + ea.text };
        }
    }

    if ((inst & 0xff00) === 0x0800 || (inst & 0xf100) === 0x0100) {
        bitName = [ 'BTST', 'BCHG', 'BCLR', 'BSET' ][(inst >> 6) & 3];
        if (bitName) {
            bitPc = pc + 2;
            if ((inst & 0x0100) !== 0)
                bitSrc = 'D' + ((inst >> 9) & 7);
            else {
                bitSrc = formatImm(machine.cpu.context.fetch(bitPc), 'w');
                bitPc += 2;
            }
            ea = formatEa(machine, bitPc, srcMode, srcReg, 'b');
            if (ea)
                return { next: ea.next, text: bitName + ' ' + bitSrc + ',' + ea.text };
        }
    }

    if ((inst & 0xf1c0) === 0x41c0) {
        ea = formatEa(machine, pc + 2, srcMode, srcReg, 'l');
        if (ea)
            return { next: ea.next, text: 'LEA ' + ea.text + ',A' + dstReg };
    }

    if ((inst & 0xffc0) === 0x4840) {
        ea = formatEa(machine, pc + 2, srcMode, srcReg, 'l');
        if (ea)
            return { next: ea.next, text: 'PEA ' + ea.text };
    }

    if ((inst & 0xffc0) === 0x4e80) {
        ea = formatEa(machine, pc + 2, srcMode, srcReg, 'l');
        if (ea)
            return { next: ea.next, text: 'JSR ' + ea.text };
    }

    if ((inst & 0xffc0) === 0x4ec0) {
        ea = formatEa(machine, pc + 2, srcMode, srcReg, 'l');
        if (ea)
            return { next: ea.next, text: 'JMP ' + ea.text };
    }

    if ((inst & 0xfb80) === 0x4880) {
        mask = machine.cpu.context.fetch(pc + 2);
        ea = formatEa(machine, pc + 4, srcMode, srcReg, (inst & 0x40) ? 'l' : 'w');
        if (ea)
            return {
                next: ea.next,
                text: 'MOVEM.' + ((inst & 0x40) ? 'L' : 'W') + ' ' +
                    (((inst & 0x0400) !== 0) ? (ea.text + ',' + formatRegisterMask(mask)) : (formatRegisterMask(mask) + ',' + ea.text))
            };
    }

    if ((inst & 0xf138) === 0x0108) {
        var movepDisp = machine.cpu.context.fetch(pc + 2);
        var movepSize = (((inst >> 6) & 1) ? 'L' : 'W');
        opmode = (inst >> 6) & 7;
        if (opmode === 4 || opmode === 5)
            return { next: pc + 4, text: 'MOVEP.' + movepSize + ' ' + '$' + hex(movepDisp & 0xffff, 4) + '(A' + srcReg + '),D' + dstReg };
        if (opmode === 6 || opmode === 7)
            return { next: pc + 4, text: 'MOVEP.' + movepSize + ' D' + dstReg + ',$' + hex(movepDisp & 0xffff, 4) + '(A' + srcReg + ')' };
    }

    if ((inst & 0xff00) === 0x4200 || (inst & 0xff00) === 0x4400 || (inst & 0xff00) === 0x4000 || (inst & 0xff00) === 0x4600 || (inst & 0xff00) === 0x4a00) {
        var unaryNames = { 0x4200: 'CLR', 0x4400: 'NEG', 0x4000: 'NEGX', 0x4600: 'NOT', 0x4a00: 'TST' };
        var unaryName = unaryNames[inst & 0xff00];
        size = [ 'B', 'W', 'L' ][(inst >> 6) & 3];
        ea = formatEa(machine, pc + 2, srcMode, srcReg, size ? size.toLowerCase() : 'w');
        if (unaryName && size && ea)
            return { next: ea.next, text: unaryName + '.' + size + ' ' + ea.text };
    }

    if ((inst & 0xffc0) === 0x4ac0) {
        ea = formatEa(machine, pc + 2, srcMode, srcReg, 'b');
        if (ea)
            return { next: ea.next, text: 'TAS ' + ea.text };
    }

    if (line === 8) {
        opmode = (inst >> 6) & 7;
        if (opmode === 3 || opmode === 7) {
            ea = formatEa(machine, pc + 2, srcMode, srcReg, 'w');
            if (ea)
                return { next: ea.next, text: (opmode === 3 ? 'DIVU' : 'DIVS') + ' ' + ea.text + ',D' + dstReg };
        }
        if (opmode <= 2 || (opmode >= 4 && opmode <= 6)) {
            size = [ 'B', 'W', 'L' ][opmode <= 2 ? opmode : opmode - 4];
            ea = formatEa(machine, pc + 2, srcMode, srcReg, size.toLowerCase());
            if (ea)
                return {
                    next: ea.next,
                    text: 'OR.' + size + ' ' + ((opmode <= 2) ? (ea.text + ',D' + dstReg) : ('D' + dstReg + ',' + ea.text))
                };
        }
    }

    if (line === 9 || line === 0xb || line === 0xc || line === 0xd) {
        opmode = (inst >> 6) & 7;
        if (line === 0xc && (opmode === 3 || opmode === 7)) {
            ea = formatEa(machine, pc + 2, srcMode, srcReg, 'w');
            if (ea)
                return { next: ea.next, text: (opmode === 3 ? 'MULU' : 'MULS') + ' ' + ea.text + ',D' + dstReg };
        }
        if (line === 0xb && opmode >= 4 && opmode <= 6) {
            size = [ 'B', 'W', 'L' ][opmode - 4];
            ea = formatEa(machine, pc + 2, srcMode, srcReg, size.toLowerCase());
            if (ea)
                return { next: ea.next, text: 'EOR.' + size + ' D' + dstReg + ',' + ea.text };
        }
        if (opmode === 3 || opmode === 7) {
            size = opmode === 7 ? 'L' : 'W';
            ea = formatEa(machine, pc + 2, srcMode, srcReg, size.toLowerCase());
            if (ea)
                return { next: ea.next, text: ({ 0x9: 'SUBA', 0xb: 'CMPA', 0xd: 'ADDA' }[line]) + '.' + size + ' ' + ea.text + ',A' + dstReg };
        }
        if (opmode <= 2 || (opmode >= 4 && opmode <= 6)) {
            size = [ 'B', 'W', 'L' ][opmode <= 2 ? opmode : opmode - 4];
            ea = formatEa(machine, pc + 2, srcMode, srcReg, size.toLowerCase());
            if (ea)
                return {
                    next: ea.next,
                    text: ({ 0x9: 'SUB', 0xb: 'CMP', 0xc: 'AND', 0xd: 'ADD' }[line]) + '.' + size + ' ' +
                        ((line !== 0xb && opmode >= 4) ? ('D' + dstReg + ',' + ea.text) : (ea.text + ',D' + dstReg))
                };
        }
    }

    if (line === 0xe) {
        var shiftRoot = [ 'AS', 'LS', 'ROX', 'RO' ][(inst >> 3) & 3];
        var shiftDir = (inst & 0x0100) ? 'L' : 'R';
        if (((inst >> 6) & 3) === 3) {
            ea = formatEa(machine, pc + 2, srcMode, srcReg, 'w');
            if (ea)
                return { next: ea.next, text: shiftRoot + shiftDir + ' ' + ea.text };
        } else {
            size = [ 'B', 'W', 'L' ][(inst >> 6) & 3];
            return {
                next: pc + 2,
                text: shiftRoot + shiftDir + '.' + size + ' ' + (((inst & 0x20) !== 0) ? ('D' + ((inst >> 9) & 7)) : ('#' + (((inst >> 9) & 7) || 8))) + ',D' + (inst & 7)
            };
        }
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
