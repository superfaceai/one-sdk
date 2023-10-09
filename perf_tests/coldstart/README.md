# Cold start performance test

Tests the time it takes to cold-start a core (full init + perform) vs. warm start it (perform with caches full).

On macOS run with `caffeinate -s ./run.sh` to prevent sleeping.