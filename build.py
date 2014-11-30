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
        #shell = True, 
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

root = os.path.dirname(os.path.abspath(__file__))
snapshot_root = os.path.join(root, 'snapshot')

def make_js_search_dirs(bin):
    return [os.path.join(root, 'test'), 
            os.path.join(root, 'src'), 
            bin];

def run_node(args, js_search_dirs, cwd=None):
    node_exe, path_separator = ('node.exe', ';') if os.name == 'nt' else ('node', ':')
    node_env = dict(list(os.environ.items())
                  + [('NODE_PATH', path_separator.join(js_search_dirs))])

    run([node_exe] + args, node_env, cwd, print_output=True)

def run_tests(bin, unit_test=None, code_test=None):
    print('run tests using "%s" ->' % bin)
    js_search_dirs = make_js_search_dirs(bin)

    if unit_test is None and code_test is None:
        unit_test = '*'
        code_test = '*'

    if unit_test:
        unit_tests = os.path.join(root, 'test', 'test_unit_run.js')
        args = [unit_tests]
        if unit_test != '*':
            args += [unit_test]
        run_node(args, js_search_dirs)

    if code_test:
        compile_tests = os.path.join(root, 'test', 'test_compile.js')
        args = [compile_tests]
        if code_test != '*':
            args += [code_test]
        run_node(args, js_search_dirs, cwd=os.path.join(root, 'test'))
    print('<-tests')

def recompile(bin):
    print('recompile oberon sources using "%s"...' % bin)
    compiler = os.path.join(root, 'src', 'oc_nodejs.js')
    sources = ['EberonSymbols.ob', 'EberonCast.ob', 'EberonCodeGenerator.ob', 'EberonConstructor.ob', 'EberonOperator.ob', 'EberonScope.ob',
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

def compile_using_snapshot(src):
    out = os.path.join(root, 'bin', 'js')
    compiler = os.path.join(snapshot_root, 'oc_nodejs.js')
    js_search_dirs = [snapshot_root]
    run_node([  compiler, 
                '--include=src/ob;src/eberon;src/oberon', 
                '--out-dir=%s' % out, 
                '--import-dir=js', 
                src],
             js_search_dirs,
             cwd=root)

def build_html(options):
    version = None
    if options.set_version:
        print(run(['git', 'pull']))
        version = run(['git', 'log', '-1', '--format="%ci%n%H"'])

    out = options.out
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

    if not options.do_not_unpack_compiled:
        print('unpacking compiled js to %s...' % package.root)
        package.unpack()

    if not os.path.exists(out):
        os.mkdir(out)

    link(['oc.js', 'oberon/oberon_grammar.js', 'eberon/eberon_grammar.js', 'test_unit.js'],
         os.path.join(out, 'oc.js'),
         ['src', 'bin', 'test'],
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

def recompile_with_replace(bin, skip_tests = False):
    recompiled = recompile(bin)
    if not skip_tests:
        run_tests(recompiled)
    
    print('%s -> %s' % (recompiled, bin))
    cleanup(bin)
    os.rename(recompiled, bin)

def pre_commit_check(options):
    bin = os.path.join(root, 'bin')
    run_tests(bin)
    recompile_with_replace(bin)
    
    print('packaging compiled js to %s...' % package.root)
    package.pack()

class compile_target(object):
    name = 'compile'
    description = 'compile oberon source file using the snapshot'

    @staticmethod
    def setup_options(parser):
        parser.add_option('--file', help='file to compile')

    def __init__(self, options):
        compile_using_snapshot(options.file)

class self_recompile_target(object):
    name = 'self-recompile'
    description = 'compile itself using current sources'

    @staticmethod
    def setup_options(parser):
        parser.add_option('--skip-tests', help='do not run test after recompile')

    def __init__(self, options):
        bin = os.path.join(root, 'bin')
        recompile_with_replace(bin, options.skip_tests)

class html_target(object):
    name = 'html'
    description = 'build html page'

    @staticmethod
    def setup_options(parser):
        parser.add_option('--out', help='output directory, default: "_out"', default='_out')
        parser.add_option('--set-version', action="store_true", help='include version in built html')
        parser.add_option('--do-not-unpack-compiled', action="store_true", help='do unpack already compiled "binaries", use current')

    def __init__(self, options):
        build_html(options)

class tests_target(object):
    name = 'tests'
    description = 'run tests'

    @staticmethod
    def setup_options(parser):
        parser.add_option('--unit', help='run specific unit test, use "*" to run all unit tests')
        parser.add_option('--code', help='run specific code generator test, use "*" to run all generator tests')

    def __init__(self, options):
        bin = os.path.join(root, 'bin')
        run_tests(bin, options.unit, options.code)

class pre_commit_target(object):
    name = 'pre-commit'
    description = 'run tests, recompile oberon sources, run tests against just recompiled sources, pack compiled sources and build html'

    @staticmethod
    def setup_options(parser):
        pass

    def __init__(self, options):
        pre_commit_check(options)

class snapshot_target(object):
    name = 'snapshot'
    description = 'make snapshot - current compiled compiler (set of *.js) to use for compiling oberon sources'

    @staticmethod
    def setup_options(parser):
        pass
        
    def __init__(self, options):
        new_dir = snapshot_root + '.new'
        cleanup(new_dir)
        shutil.copytree(os.path.join(root, 'src'), new_dir)
        shutil.copytree(os.path.join(root, 'bin', 'js'), os.path.join(new_dir, 'js'))
        if os.path.exists(snapshot_root):
            old_dir = snapshot_root + '.bak'
            cleanup(old_dir)
            os.rename(snapshot_root, old_dir)
        os.rename(new_dir, snapshot_root)

targets = [compile_target, self_recompile_target, html_target, tests_target, pre_commit_target, snapshot_target]

def build(target, options):
    targets[target](options)

if __name__ == '__main__':
    description = 'Targets: %s' % '|'.join([t.name for t in targets])
    parser = optparse.OptionParser(
        description=description,
        usage='%prog [options] <target>'
        )
    for t in targets:
        group = optparse.OptionGroup(parser, 'target "%s"' % t.name, t.description)
        t.setup_options(group)
        parser.add_option_group(group)

    (options, args) = parser.parse_args()
    if len(args) != 1:
        parser.print_help();
        exit(-1)
    
    target_name = args[0]
    target = None
    for t in targets:
        if t.name == target_name:
            target = t
            break

    if target is None:
        print('uknown target: "%s"' % target_name)
        exit(-1)
    
    target(options)