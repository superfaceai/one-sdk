# Cold start performance test

Tests the time it takes to cold-start a core (full init + perform) vs. warm start it (perform with caches full).

On macOS run with `caffeinate -d ./run.sh` to prevent sleeping.

Create plots with `plot.py data/node_data_10k.csv [plots/node_10k.png]` (if you omit the second argument it will open in interactive window).
