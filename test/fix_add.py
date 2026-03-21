#!/usr/bin/env python3
# Fix decodeD - src/dst registers were swapped

with open('/home/smalley/reference/j68k/src/j68.js', 'r') as f:
    content = f.read()

# Fix the register assignment for ADD Dn,Dn
old_code = '''            case 0:  // ADD.b Dn, Dn
            case 1:  // ADD.w Dn, Dn  
            case 2:  // ADD.l Dn, Dn
                var srcReg = r;
                var dstReg = (inst >> 0) & 7;'''

new_code = '''            case 0:  // ADD.b Dn, Dn
            case 1:  // ADD.w Dn, Dn  
            case 2:  // ADD.l Dn, Dn
                var dstReg = r;  // Destination is in bits 9-11
                var srcReg = (inst >> 0) & 7;  // Source is in bits 0-2 for Dn mode'''

content = content.replace(old_code, new_code)

with open('/home/smalley/reference/j68k/src/j68.js', 'w') as f:
    f.write(content)

print("Fixed decodeD register assignment")
