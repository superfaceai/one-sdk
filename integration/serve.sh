base=$(dirname "$0")
python3 -m http.server 8321 --directory "$base/js" --bind '127.0.0.1'
