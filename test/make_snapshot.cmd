del /S /Q ..\snapshot
mkdir ..\snapshot
mkdir ..\snapshot\oberon.js
copy ..\src\*.js ..\snapshot
copy ..\src\oberon.js\*.js ..\snapshot\oberon.js
