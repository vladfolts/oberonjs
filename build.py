#!/usr/bin/python
from browser.linkjs import link
import os
import subprocess
import sys

def run(cmd):
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE, stderr = subprocess.STDOUT)
    return p.stdout.read().decode()

def build(out, use_git):
    version = None
    if use_git:
        print(run('git pull'))
        version = run('git log -1 --format="%ci%n%H"')

    build_version = None
    build_version_path = os.path.join(out, 'version.txt')
    try:
        with open(build_version_path) as f:
            build_version = f.read()
    except:
        pass

    if (not build_version is None) and build_version == version:
        print("current html is up to date, do nothing")
        return

    if not os.path.exists(out):
        os.mkdir(out)
    link('oc.js', os.path.join(out, 'oc.js'), 'src', version)

    with open('browser/oberonjs.html') as input:
        with open(os.path.join(out, 'oberonjs.html'), 'w') as output:
            output.write(input.read())
    
    if version is None:
        if os.path.exists(build_version_path):
            os.remove(build_version_path)
    else:
        with open(build_version_path, 'w') as f:
            f.write(version)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Pull repo and build html page\nUsage: build.py <output directory> [--no-git]')
        exit(-1)
    use_git = len(sys.argv) < 3 or sys.argv[2] != '--no-git'
    build(sys.argv[1], use_git)