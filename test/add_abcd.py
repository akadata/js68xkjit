#!/usr/bin/env python3
with open('/home/smalley/reference/j68k/src/j68.js', 'r') as f:
    content = f.read()

# Add ABCD handling to decodeC before "Default AND"
old_text = '''        // Default AND
        this.log('not impl: line=C, opmode=' + opmode.toString(16));
        throw console.assert(false);
    };
    
    // Line E: Shift/Rotate'''

new_text = '''        // ABCD (opmode 4)
        if (opmode === 4) {
            return { 'code': ['/* ABCD */'], 'pc': pc + 2 };
        }
        // Default AND
        this.log('not impl: line=C, opmode=' + opmode.toString(16));
        throw console.assert(false);
    };
    
    // Line E: Shift/Rotate'''

content = content.replace(old_text, new_text)

with open('/home/smalley/reference/j68k/src/j68.js', 'w') as f:
    f.write(content)

print("Done")
