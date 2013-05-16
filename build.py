#!/usr/bin/python
from browser.linkjs import link
import os
import shutil
import sys

def run(cmd):
    code = os.system(cmd)
    if code:
        raise Exception('"%s" failed: %d' % (cmd, code))

def build(out):
    run('git pull')
    if not os.path.exists(out):
        os.mkdir(out)
    link('oc.js', os.path.join(out, 'oc.js'), 'src')

    with open('browser/oberonjs.html') as input:
        with open(os.path.join(out, 'oberonjs.html'), 'w') as output:
            output.write(input.read())

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print 'Pull repo and build html page\nUsage: build.py <output directory>'
        exit(-1)
    build(sys.argv[1])