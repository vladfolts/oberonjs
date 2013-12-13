del /S /Q ..\snapshot
mkdir ..\snapshot
mkdir ..\snapshot\eberon
mkdir ..\snapshot\oberon
copy ..\src\*.js ..\snapshot
copy ..\src\eberon\*.js ..\snapshot\eberon
copy ..\src\oberon\*.js ..\snapshot\oberon
