#!/usr/bin/env bash

set -euo pipefail

mode=""
flags=()

for arg in "$@"; do
    case "$arg" in
        bench|full|runner)
            if [ -n "$mode" ]; then
                echo "usage: $0 [bench|full|runner] [--from-source|--rebuild-missing|--rebuild-all|--clean]" >&2
                exit 1
            fi
            mode="$arg"
            ;;
        --from-source|--rebuild-missing|--rebuild-all|--clean)
            flags+=("$arg")
            ;;
        "")
            ;;
        *)
            echo "usage: $0 [bench|full|runner] [--from-source|--rebuild-missing|--rebuild-all|--clean]" >&2
            exit 1
            ;;
    esac
done

SYSTEM_TESTS=(
    test/system/boot.test.js
    test/system/memory_map.test.js
    test/system/bus_device.test.js
    test/system/bus_transaction.test.js
    test/system/uart_boot.test.js
    test/system/monitor.test.js
    test/system/monitor_errors.test.js
    test/system/monitor_reset.test.js
    test/system/monitor_patch_loadsave.test.js
    test/system/monitor_loadasm.test.js
    test/system/monitor_saveasm.test.js
    test/system/monitor_assemble_roundtrip.test.js
    test/system/monitor_assemble_loop.test.js
    test/system/monitor_disasm.test.js
    test/system/monitor_exec.test.js
    test/system/monitor_cli.test.js
    test/system/monitor_line_editor.test.js
    test/system/monitor_program_output.test.js
    test/system/monitor_program_input.test.js
    test/system/monitor_timer.test.js
    test/system/irq.test.js
)

BENCH_TEST="test/system/monitor_bench.test.js"
CPU_TYPES=(68000 68020 68030 68040)

contains_flag() {
    local needle="$1"
    shift || true
    local item
    for item in "$@"; do
        if [ "$item" = "$needle" ]; then
            return 0
        fi
    done
    return 1
}

prepare_generated() {
    if contains_flag --clean "${flags[@]}"; then
        node -e "require('./tools/support/assemble_m68k').cleanGenerated()"
    fi
}

run_system_tests() {
    local cpu="${1:-}"
    local env_args=()

    if [ -n "$cpu" ]; then
        echo "----- Testing CPU ${cpu} -----"
    fi

    if contains_flag --from-source "${flags[@]}" || contains_flag --rebuild-all "${flags[@]}"; then
        env_args+=(J68_FROM_SOURCE=1)
    fi

    for test_file in "${SYSTEM_TESTS[@]}"; do
        if [ -n "$cpu" ]; then
            env "${env_args[@]}" J68_CPU_TYPE="$cpu" node "$test_file"
        else
            env "${env_args[@]}" node "$test_file"
        fi
    done
}

run_bench_tests() {
    for cpu in "${CPU_TYPES[@]}"; do
        echo "----- Benchmark CPU ${cpu} -----"
        J68_CPU_TYPE="$cpu" node "$BENCH_TEST"
    done
}

run_runner() {
    pushd test >/dev/null || exit 1
    node runner.js "${flags[@]}"
    popd >/dev/null || exit 1
}

prepare_generated

case "$mode" in
    "")
        run_system_tests
        ;;
    bench)
        run_bench_tests
        ;;
    full)
        for cpu in "${CPU_TYPES[@]}"; do
            run_system_tests "$cpu"
        done
        run_bench_tests
        run_runner
        ;;
    runner)
        run_runner
        ;;
    *)
        echo "usage: $0 [bench|full|runner] [--from-source|--rebuild-missing|--rebuild-all|--clean]" >&2
        exit 1
        ;;
esac
