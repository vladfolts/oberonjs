
#!/usr/bin/python
from browser.linkjs import link
import os
import shutil
import stat
import subprocess
import sys

# http://stackoverflow.com/questions/1889597/deleting-directory-in-python
def remove_readonly(fn, path, excinfo):
    if fn is os.rmdir:
        os.chmod(path, stat.S_IWRITE)
        os.rmdir(path)
    elif fn is os.remove:
        os.chmod(path, stat.S_IWRITE)
        os.remove(path)

def norm_path(path):
    return os.path.normcase(os.path.normpath(os.path.realpath(os.path.abspath(path))))

def is_parent_for(parent, child):
    parent = norm_path(parent)
    child = norm_path(child)
    while True:
        if parent == child:
            return True
        next = os.path.dirname(child)
        if next == child:
            return False
        child = next

def cleanup(dir):
    this_dir = os.path.dirname(__file__)
    if is_parent_for(dir, this_dir):
        raise Exception("cannot delete itself: %s" % this_dir)
    shutil.rmtree(dir, onerror=remove_readonly)

def copy(src, dst_dir):
    dst = os.path.join(dst_dir, os.path.basename(src))
    if os.path.exists(dst):
        os.chmod(dst, stat.S_IWRITE)
    print('%s -> %s' % (src, dst))
    shutil.copy(src, dst)

def copytree(src, dst):
    if os.path.exists(dst):
        cleanup(dst)
    print('%s -> %s' % (src, dst))
    shutil.copytree(src, dst)

def run(cmd):
    p = subprocess.Popen(cmd, stdout = subprocess.PIPE, stderr = subprocess.STDOUT, shell = True)
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

    link('oc.js', os.path.join(out, 'oc.js'), ['src'], version)
    copy('browser/oberonjs.html', out)
    copytree('browser/codemirror', os.path.join(out, 'codemirror'))
    
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