#!/usr/bin/env bash
runner=$1
node test/system/boot.test.js
node test/system/memory_map.test.js
node test/system/bus_device.test.js
node test/system/bus_transaction.test.js
node test/system/uart_boot.test.js
node test/system/monitor.test.js
node test/system/monitor_errors.test.js
node test/system/monitor_reset.test.js
node test/system/monitor_patch_loadsave.test.js
node test/system/monitor_loadasm.test.js
node test/system/monitor_assemble_roundtrip.test.js
node test/system/monitor_assemble_loop.test.js
node test/system/monitor_disasm.test.js
node test/system/monitor_exec.test.js
node test/system/monitor_cli.test.js
node test/system/monitor_bench.test.js
node test/system/monitor_timer.test.js
node test/system/irq.test.js
if [ "$runner" == "runner" ]; then 
	pushd test
	node runner.js
	popd
fi
