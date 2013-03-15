mkdir _out
cd src
..\browser\linkjs.py oc.js ../_out/oc.js
cd ..
copy browser\oberonjs.html _out
start _out\oberonjs.html