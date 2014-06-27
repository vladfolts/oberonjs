#!/usr/bin/python
import optparse
import os

def run(cmd):
    rc = os.system(cmd)
    if rc != 0:
        raise Exception('"%s" failed with exit code %d' % (cmd, rc))

def main(out):
    run('git pull')
    run('./build.py --out="%s" --set-version html' % out)

parser = optparse.OptionParser(
    description='Pull repo and build html page',
    usage='%prog <output directory>'
    )
(options, args) = parser.parse_args()
if len(args) != 1:
    parser.print_help();
    exit(-1)

main(args[0])