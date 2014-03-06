del /S /Q ..\snapshot
mkdir ..\snapshot\js
mkdir ..\snapshot\eberon
mkdir ..\snapshot\oberon
copy ..\src\*.js ..\snapshot
copy ..\src\eberon\*.js ..\snapshot\eberon
copy ..\src\oberon\*.js ..\snapshot\oberon
copy ..\bin\js\*.js ..\snapshot\js
