
#!/usr/bin/python
from browser.linkjs import link
import optparse
import os
import shutil
import stat
import subprocess
import sys
import zipfile

class package( object ):
    root = os.path.join('bin', 'js')
    archive = os.path.join('bin', 'compiled.zip')

    @staticmethod
    def pack():
        file = zipfile.ZipFile(package.archive, 'w')
        for f in os.listdir(package.root):
            file.write(os.path.join(package.root, f), f)

    @staticmethod
    def unpack():
        cleanup(package.root)
        file = zipfile.ZipFile(package.archive, 'r')
        file.extractall(package.root)

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
    if not os.path.exists(dir):
        return

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
    cleanup(dst)
    print('%s -> %s' % (src, dst))
    shutil.copytree(src, dst)

def run(cmd, env=None, cwd=None, print_output=False):
    p = subprocess.Popen(
        cmd, 
        stdout=None if print_output else subprocess.PIPE, 
        stderr=subprocess.STDOUT, 
        shell = True, 
        env=env,
        cwd=cwd)

    result = None if print_output else p.stdout.read().decode()
    rc = p.wait()
    if rc:
        if result:
            print(result)
        print('"%s" failed with exit code %d' % (' '.join(cmd), rc))
        exit(rc)
    return result

root = os.path.dirname(__file__)

def make_js_search_dirs(bin):
    return [os.path.join(root, 'test'), 
            os.path.join(root, 'src'), 
            bin];

def run_node(args, js_search_dirs, cwd=None):
    node_exe = 'node.exe' if os.name == 'nt' else 'node'
    node_env = dict(os.environ.items() 
                  + [('NODE_PATH', ';'.join(js_search_dirs))])

    run([node_exe] + args, node_env, cwd, print_output=True)

def run_tests(bin):
    print('run tests using "%s" ->' % bin)
    js_search_dirs = make_js_search_dirs(bin)

    unit_tests = os.path.join(root, 'test', 'test_unit.js')
    run_node([unit_tests], js_search_dirs)

    compile_tests = os.path.join(root, 'test', 'test_compile.js')
    run_node([compile_tests], js_search_dirs, cwd=os.path.join(root, 'test'))
    print('<-tests')

def recompile(bin):
    print 'recompile oberon sources using "%s"...' % bin
    compiler = os.path.join(root, 'src', 'oc_nodejs.js')
    sources = ['EberonSymbols.ob', 'EberonCast.ob', 'EberonOperator.ob', 
               'OberonSymbols.ob', 'Lexer.ob', 'Module.ob']
    
    result = os.path.join(root, 'bin.recompile')
    cleanup(result)
    os.mkdir(result)
    out = os.path.join(result, 'js')
    os.mkdir(out)

    run_node([compiler, 
              '--include=src/ob;src/eberon;src/oberon', 
              '--out-dir=%s' % out, 
              '--import-dir=js',
              '--timing=true'] 
              + sources,
             make_js_search_dirs(bin))
    return result

def build(options):
    version = None
    if not (options.no_git or options.pre_commit):
        print(run('git pull'))
        version = run('git log -1 --format="%ci%n%H"')

    out = options.output
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

    if options.pre_commit:
        bin = os.path.join(root, 'bin')
        run_tests(bin)
        recompiled = recompile(bin)
        run_tests(recompiled)
        
        print('%s -> %s' % (recompiled, bin))
        cleanup(bin)
        os.rename(recompiled, bin)
        
        print('packaging compiled js to %s...' % package.root)
        package.pack()
    else:
        print('unpacking compiled js to %s...' % package.root)
        package.unpack()

    if not os.path.exists(out):
        os.mkdir(out)

    link(['oc.js', 'oberon/oberon_grammar.js', 'eberon/eberon_grammar.js'],
         os.path.join(out, 'oc.js'),
         ['src', 'bin'],
         version)
    copy('browser/oberonjs.html', out)
    for d in ['codemirror', 'jslibs']:
        copytree(os.path.join('browser', d), os.path.join(out, d))
    
    if version is None:
        if os.path.exists(build_version_path):
            os.remove(build_version_path)
    else:
        with open(build_version_path, 'w') as f:
            f.write(version)

if __name__ == '__main__':
    parser = optparse.OptionParser(
        description='Pull repo and build html page',
        usage='%prog [options] <output directory>'
        )
    parser.add_option('--no-git', help='do not pull from git', action="store_true")
    parser.add_option('--pre-commit', help='run tests, build html and pack compiled source', action="store_true")
    (options, args) = parser.parse_args()
    if len(args) != 1:
        parser.print_help();
        exit(-1)
        
    options.output = args[0]
    build(options)