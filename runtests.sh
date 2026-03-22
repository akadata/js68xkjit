#!/usr/bin/env bash
runner=$1
node test/system/boot.test.js
node test/system/memory_map.test.js
node test/system/uart_boot.test.js
node test/system/monitor.test.js
node test/system/irq.test.js
if [ "$runner" == "runner" ]; then 
	pushd test
	node runner.js
	popd
fi
