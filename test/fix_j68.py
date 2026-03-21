#!/usr/bin/env python3
with open('/home/smalley/reference/j68k/src/j68.js', 'r') as f:
    content = f.read()

# Fix run function to check halt before compile
old_run = '''    j68.prototype.run = function () {
        var c = this.context;
        for (;;) {
            var pc = c.pc;
            if (!c.c[pc])
                c.c[pc] = this.compile();
            c.c[pc](c);
            if (c.halt)
                break;
        }
    };'''

new_run = '''    j68.prototype.run = function () {
        var c = this.context;
        for (;;) {
            if (c.halt) break;
            var pc = c.pc;
            if (!c.c[pc])
                c.c[pc] = this.compile();
            c.c[pc](c);
        }
    };'''

content = content.replace(old_run, new_run)

# Disable logging
content = content.replace('this.logJit = true;', 'this.logJit = false;')
content = content.replace('this.logOpt = true;', 'this.logOpt = false;')
content = content.replace('this.logDecode = true;', 'this.logDecode = false;')

with open('/home/smalley/reference/j68k/src/j68.js', 'w') as f:
    f.write(content)

print("Done")
