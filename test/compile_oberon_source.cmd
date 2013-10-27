@SET NODE_PATH=%~dp0../snapshot/oberon.js

cd %~dp0../src/oberon
call %~dp0/run_nodejs.cmd %~dp0../snapshot/oc_nodejs.js %~dp0../src/oberon.js %~dp0../src/oberon/Stream.ob
cd %~dp0