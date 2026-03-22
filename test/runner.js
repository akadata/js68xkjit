#!/bin/env node

var assert = require('assert');
var buffer = require('buffer');
var fs = require('fs');
var j68 = require('../src/j68');

var json = JSON.parse(fs.readFileSync('test.list', { encoding: 'utf8' }));
var skipFile = process.env.J68_SKIP_FILE;
var failFast = process.env.J68_FAIL_FAST === '1';
var skipped = 0;
var harness = {
	'r/rte_frame.r': {
		setup: function (cpu) {
			cpu.context.setSr(0x2000);
			cpu.context.a[7] = 0x1ffa;
			cpu.context.ssp = 0x1ffa;
			cpu.context.s16(0x1ffa, 0x2015);
			cpu.context.s32(0x1ffc, 0x102);
			cpu.context.pc = 0x100;
		}
	},
	'r/rte_privtrap.r': {
		setup: function (cpu) {
			cpu.context.a[7] = 0x2000;
			cpu.context.usp = 0x2000;
			cpu.context.ssp = 0x3000;
			cpu.context.pc = 0x100;
		}
	},
	'r/rtr_frame.r': {
		setup: function (cpu) {
			cpu.context.a[7] = 0x1ffa;
			cpu.context.usp = 0x1ffa;
			cpu.context.s16(0x1ffa, 0x0015);
			cpu.context.s32(0x1ffc, 0x102);
			cpu.context.pc = 0x100;
		}
	},
	'r/rte.r': {
		setup: function (cpu) {
			cpu.context.setSr(0x2000);
			cpu.context.a[7] = 0x1ffa;
			cpu.context.ssp = 0x1ffa;
			cpu.context.s16(0x1ffa, 0x2015);
			cpu.context.s32(0x1ffc, 0x102);
			cpu.context.pc = 0x100;
		}
	},
	'r/rtr.r': {
		setup: function (cpu) {
			cpu.context.a[7] = 0x1ffa;
			cpu.context.usp = 0x1ffa;
			cpu.context.s16(0x1ffa, 0x0015);
			cpu.context.s32(0x1ffc, 0x102);
			cpu.context.pc = 0x100;
		}
	},
	'r/rtd_stack.r': {
		setup: function (cpu) {
			cpu.context.a[7] = 0x2000;
			cpu.context.usp = 0x2000;
			cpu.context.pc = 0x100;
		}
	},
	'r/rtd.r': {
		setup: function (cpu) {
			cpu.context.a[7] = 0x2000;
			cpu.context.usp = 0x2000;
			cpu.context.pc = 0x100;
		}
	},
	'r/movec_privtrap.r': {
		setup: function (cpu) {
			cpu.context.a[7] = 0x2000;
			cpu.context.usp = 0x2000;
			cpu.context.ssp = 0x3000;
			cpu.context.pc = 0x100;
		}
	},
	'r/movec_super.r': {
		setup: function (cpu) {
			cpu.context.setSr(0x2000);
			cpu.context.a[7] = 0x2000;
			cpu.context.ssp = 0x2000;
			cpu.context.pc = 0x100;
		}
	},
	'r/movec_c_to_r.r': {
		setup: function (cpu) {
			cpu.context.setSr(0x2000);
			cpu.context.a[7] = 0x2000;
			cpu.context.ssp = 0x2000;
			cpu.context.cacr = 5;
			cpu.context.pc = 0x100;
		}
	},
	'r/movec_r_to_c.r': {
		setup: function (cpu) {
			cpu.context.setSr(0x2000);
			cpu.context.a[7] = 0x2000;
			cpu.context.ssp = 0x2000;
			cpu.context.pc = 0x100;
		}
	},
	'r/moves_privtrap.r': {
		setup: function (cpu) {
			cpu.context.a[7] = 0x2000;
			cpu.context.usp = 0x2000;
			cpu.context.ssp = 0x3000;
			cpu.context.pc = 0x100;
		}
	},
	'r/moves_super.r': {
		setup: function (cpu) {
			cpu.context.setSr(0x2000);
			cpu.context.a[7] = 0x2000;
			cpu.context.ssp = 0x2000;
			cpu.context.pc = 0x100;
		}
	},
	'r/moves_b.r': {
		setup: function (cpu) {
			cpu.context.setSr(0x2000);
			cpu.context.a[7] = 0x2000;
			cpu.context.ssp = 0x2000;
			cpu.context.pc = 0x100;
		}
	},
	'r/moves_w.r': {
		setup: function (cpu) {
			cpu.context.setSr(0x2000);
			cpu.context.a[7] = 0x2000;
			cpu.context.ssp = 0x2000;
			cpu.context.pc = 0x100;
		}
	},
	'r/moves_l.r': {
		setup: function (cpu) {
			cpu.context.setSr(0x2000);
			cpu.context.a[7] = 0x2000;
			cpu.context.ssp = 0x2000;
			cpu.context.pc = 0x100;
		}
	},
	'r/stop_privtrap.r': {
		setup: function (cpu) {
			cpu.context.a[7] = 0x2000;
			cpu.context.usp = 0x2000;
			cpu.context.ssp = 0x3000;
			cpu.context.pc = 0x100;
		}
	},
	'r/stop_super.r': {
		setup: function (cpu) {
			cpu.context.setSr(0x2000);
			cpu.context.usp = 0x2000;
			cpu.context.ssp = 0x3000;
			cpu.context.a[7] = 0x3000;
			cpu.context.pc = 0x100;
		},
		allowHalt: true,
		validate: function (cpu) {
			assert.equal(cpu.context.halt, true, 'STOP did not halt the CPU');
			assert.equal(cpu.context.pc >>> 0, 0x104, 'STOP did not advance PC to the next instruction');
			assert.equal(cpu.context.sr & 0x200f, 0x0005, 'STOP did not load SR from the immediate operand');
			assert.equal(cpu.context.a[7] >>> 0, 0x2000, 'STOP did not switch to USP when the new SR cleared S');
			assert.equal(cpu.context.ssp >>> 0, 0x3000, 'STOP did not preserve the supervisor stack pointer');
		}
	},
	'r/stop.r': {
		setup: function (cpu) {
			cpu.context.setSr(0x2000);
			cpu.context.usp = 0x2000;
			cpu.context.ssp = 0x3000;
			cpu.context.a[7] = 0x3000;
			cpu.context.pc = 0x100;
		},
		allowHalt: true,
		validate: function (cpu) {
			assert.equal(cpu.context.halt, true, 'STOP did not halt the CPU');
			assert.equal(cpu.context.pc >>> 0, 0x104, 'STOP did not advance PC to the next instruction');
			assert.equal(cpu.context.sr & 0x200f, 0x0005, 'STOP did not load SR from the immediate operand');
			assert.equal(cpu.context.a[7] >>> 0, 0x2000, 'STOP did not switch to USP when the new SR cleared S');
			assert.equal(cpu.context.ssp >>> 0, 0x3000, 'STOP did not preserve the supervisor stack pointer');
		}
	},
	'r/bfchg.r': {
		setup: function (cpu) {
			cpu.type = j68.j68.TYPE_MC68020;
			cpu.context.pc = 0x100;
		}
	},
	'r/bfclr.r': {
		setup: function (cpu) {
			cpu.type = j68.j68.TYPE_MC68020;
			cpu.context.pc = 0x100;
		}
	},
	'r/bfexts.r': {
		setup: function (cpu) {
			cpu.type = j68.j68.TYPE_MC68020;
			cpu.context.pc = 0x100;
		}
	},
	'r/bfextu.r': {
		setup: function (cpu) {
			cpu.type = j68.j68.TYPE_MC68020;
			cpu.context.pc = 0x100;
		}
	},
	'r/bfffo.r': {
		setup: function (cpu) {
			cpu.type = j68.j68.TYPE_MC68020;
			cpu.context.pc = 0x100;
		}
	},
	'r/bfins.r': {
		setup: function (cpu) {
			cpu.type = j68.j68.TYPE_MC68020;
			cpu.context.pc = 0x100;
		}
	},
	'r/bfset.r': {
		setup: function (cpu) {
			cpu.type = j68.j68.TYPE_MC68020;
			cpu.context.pc = 0x100;
		}
	},
	'r/bftst.r': {
		setup: function (cpu) {
			cpu.type = j68.j68.TYPE_MC68020;
			cpu.context.pc = 0x100;
		}
	},
	'r/cinv.r': {
		setup: function (cpu) {
			cpu.type = j68.j68.TYPE_MC68040;
			cpu.context.setSr(0x2015);
			cpu.context.a[7] = 0x2000;
			cpu.context.ssp = 0x2000;
			cpu.context.d[0] = 0x12345678;
			cpu.context.pc = 0x100;
		}
	},
	'r/cpush.r': {
		setup: function (cpu) {
			cpu.type = j68.j68.TYPE_MC68040;
			cpu.context.usp = 0x2000;
			cpu.context.ssp = 0x3000;
			cpu.context.a[7] = 0x2000;
			cpu.context.pc = 0x100;
		}
	},
	'r/move16_mem_mem.r': {
		setup: function (cpu) {
			cpu.type = j68.j68.TYPE_MC68040;
			cpu.context.pc = 0x100;
		}
	},
	'r/move16_mem_reg.r': {
		setup: function (cpu) {
			cpu.type = j68.j68.TYPE_MC68040;
			cpu.context.pc = 0x100;
		}
	},
	'r/pflush.r': {
		setup: function (cpu) {
			cpu.type = j68.j68.TYPE_MC68040;
			cpu.context.setSr(0x2015);
			cpu.context.ssp = 0x2000;
			cpu.context.a[7] = 0x2000;
			cpu.context.d[0] = 5;
			cpu.context.dfc = 1;
			cpu.context.pc = 0x100;
		}
	},
	'r/pflusha.r': {
		setup: function (cpu) {
			cpu.type = j68.j68.TYPE_MC68040;
			cpu.context.setSr(0x2015);
			cpu.context.ssp = 0x2000;
			cpu.context.a[7] = 0x2000;
			cpu.context.d[0] = 6;
			cpu.context.pc = 0x100;
		}
	},
	'r/pload.r': {
		setup: function (cpu) {
			cpu.type = j68.j68.TYPE_MC68030;
			cpu.context.usp = 0x2000;
			cpu.context.ssp = 0x3000;
			cpu.context.a[7] = 0x2000;
			cpu.context.pc = 0x100;
		}
	},
	'r/pmove.r': {
		setup: function (cpu) {
			cpu.type = j68.j68.TYPE_MC68030;
			cpu.context.setSr(0x2015);
			cpu.context.ssp = 0x2000;
			cpu.context.a[7] = 0x2000;
			cpu.context.tc = 5;
			cpu.context.pc = 0x100;
		}
	},
	'r/ptest.r': {
		setup: function (cpu) {
			cpu.type = j68.j68.TYPE_MC68040;
			cpu.context.usp = 0x2000;
			cpu.context.ssp = 0x3000;
			cpu.context.a[7] = 0x2000;
			cpu.context.pc = 0x100;
		}
	},
	'r/trapcc.r': {
		setup: function (cpu) {
			cpu.type = j68.j68.TYPE_MC68020;
			cpu.context.setSr(0x0015);
			cpu.context.usp = 0x2000;
			cpu.context.ssp = 0x3000;
			cpu.context.a[7] = 0x2000;
			cpu.context.pc = 0x100;
		}
	}
};
var invalidSmoke = {
	'r/callm.r': 'CALLM requires a valid module descriptor and transfer target; this local smoke test points A0 at the program image',
	'r/rtm.r': 'RTM requires a saved module state on the stack from a prior CALLM'
};
if (skipFile) {
	var skip = {};
	fs.readFileSync(skipFile, { encoding: 'utf8' }).split(/\r?\n/).forEach(function (line) {
		line = line.replace(/#.*/, '').trim();
		if (line.length > 0)
			skip[line] = true;
	});
	skipped = json.tests.filter(function (test) {
		return skip[test];
	}).length;
	json.tests = json.tests.filter(function (test) {
		return !skip[test];
	});
}
function parseCheck(cpu, inst) {
	var pc = cpu.context.pc;
	if (inst === 0xffff) {
		if (cpu.context.l32(pc) === 0xffffffff) {
			throw new Error('malformed check block: 0xffff sentinel followed by 0xffffffff marker');
		}
		pc += 2;
	} else {
		assert.equal(cpu.context.l32(pc), 0xffffffff, 'missing 0xffffffff check marker');
		pc += 4;
	}
	for (;;) {
		var command = cpu.context.l32(pc);
		pc += 4;
		if (0 == command) {
			break;
		} else if (0xa0 <= command && command <= 0xa7) {
			var ar = command - 0xa0;
			assert.equal(cpu.context.a[ar], cpu.context.l32(pc), command.toString(16));
			pc += 4;
		} else if (0xd0 <= command && command <= 0xd7) {
			var dr = command - 0xd0;
			assert.equal(cpu.context.d[dr], cpu.context.l32(pc), command.toString(16));
			pc += 4;
		} else if (0xf00 <= command && command <= 0xf1f) {
			var mask = command & 0x1f;
			assert.equal(cpu.context.sr & mask, cpu.context.l32(pc), command.toString(16));
			pc += 4;
		} else if (command === 0xf20) {
			var srMask = cpu.context.l32(pc);
			var srExpect = cpu.context.l32(pc + 4);
			assert.equal(cpu.context.sr & srMask, srExpect, command.toString(16));
			pc += 8;
		} else if (command === 0xe0) {
			var addr8 = cpu.context.l32(pc);
			var expect8 = cpu.context.l32(pc + 4);
			assert.equal(cpu.context.l8(addr8), expect8 & 0xff, command.toString(16));
			pc += 8;
		} else if (command === 0xe1) {
			var addr16 = cpu.context.l32(pc);
			var expect16 = cpu.context.l32(pc + 4);
			assert.equal(cpu.context.l16(addr16), expect16 & 0xffff, command.toString(16));
			pc += 8;
		} else if (command === 0xe2) {
			var addr32 = cpu.context.l32(pc);
			var expect32 = cpu.context.l32(pc + 4);
			assert.equal(cpu.context.l32(addr32), expect32 >>> 0, command.toString(16));
			pc += 8;
		} else {
			throw new Error('unknown command: ' + command.toString(16));
		}
	}
}

var passed = 0;
var failed = [];
function errorMessage(err) {
	if (err && err.message)
		return err.message;
	if (typeof err === 'string')
		return err;
	return String(err);
}

function classifyFailure(message, logs) {
	var logText = logs.join('\n');
	if (invalidSmoke[currentTest])
		return 'invalid local smoke test';
	if (message.indexOf('malformed check block:') === 0)
		return 'malformed placeholder test';
	if (/not impl|simplified/i.test(logText))
		return 'not implemented';
	if (/Offset is outside the bounds of the DataView|test did not reach check handler|unknown command:/i.test(message))
		return 'control-flow\/stack fault';
	return 'wrong result\/flags';
}

var categoryOrder = [
	'invalid local smoke test',
	'malformed placeholder test',
	'not implemented',
	'wrong result/flags',
	'control-flow/stack fault'
];
var categories = {};
categoryOrder.forEach(function (name) {
	categories[name] = [];
});
var currentTest = '';
json.tests.forEach(function (test) {
	currentTest = test;
	console.log(test);
	if (invalidSmoke[test]) {
		var invalidMessage = invalidSmoke[test];
		failed.push({ test: test, error: invalidMessage, message: invalidMessage, category: 'invalid local smoke test' });
		categories['invalid local smoke test'].push(test);
		console.error('FAIL ' + test + ' [invalid local smoke test]: ' + invalidMessage);
		return;
	}
	try {
		var file = fs.readFileSync(test);
		var cpu = new j68.j68();
		var logs = [];
		cpu.log = function (message) {
			logs.push(message);
			console.log('j68: ' + message);
		};
		for (var i = 0; i < file.length; ++i)
		    cpu.context.s8(i, file[i]|0);
		cpu.context.pc = 0;
			var harnessEntry = harness[test];
			if (harnessEntry) {
				if (typeof harnessEntry === 'function')
					harnessEntry(cpu);
				else if (harnessEntry.setup)
					harnessEntry.setup(cpu);
			}
			var success = false;
			cpu.context.f = function (inst) {
			    parseCheck(cpu, inst);
			    cpu.context.halt = true;
			    success = true;
			};
			cpu.run();
			if (!success && harnessEntry && harnessEntry.allowHalt) {
				harnessEntry.validate(cpu);
				success = true;
			}
			assert.equal(success, true, 'test did not reach check handler');
			passed += 1;
	} catch (err) {
		var message = errorMessage(err);
		var category = classifyFailure(message, logs || []);
		failed.push({ test: test, error: err, message: message, category: category });
		categories[category].push(test);
		console.error('FAIL ' + test + ' [' + category + ']: ' + message);
		if (failFast)
			throw err;
	}
});

console.log('');
console.log('Passed: ' + passed + '/' + json.tests.length);
console.log('Failed: ' + failed.length + '/' + json.tests.length);
if (skipFile)
	console.log('Skipped: ' + skipped);
if (failed.length > 0) {
	console.log('');
	categoryOrder.forEach(function (name) {
		if (categories[name].length > 0)
			console.log(name + ': ' + categories[name].length);
	});
	console.log('');
	failed.forEach(function (entry) {
		console.log(entry.test + ' [' + entry.category + ']: ' + entry.message);
	});
	process.exitCode = 1;
}
