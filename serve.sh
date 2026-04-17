#!/bin/bash
node proxy.js &
sleep 1
open http://localhost:8000/fb-search.html
python3 -m http.server 8000
