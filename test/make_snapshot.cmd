del /S /Q ..\snapshot
mkdir ..\snapshot
mkdir ..\snapshot\eberon
mkdir ..\snapshot\oberon
mkdir ..\snapshot\js
copy ..\src\*.js ..\snapshot
copy ..\src\eberon\*.js ..\snapshot\eberon
copy ..\src\oberon\*.js ..\snapshot\oberon
copy ..\src\js\*.js ..\snapshot\js
