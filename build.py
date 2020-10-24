#!/usr/bin/python
from browser.linkjs import link
import argparse
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import zipfile

root = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(root, 'src')
default_out_dir = os.path.join(root, '_out')
default_out_js = os.path.join(default_out_dir, 'js')

class Package( object ):
    bin_dir = os.path.join(root, 'bin')
    js_root = os.path.join(bin_dir, 'js')
    archive = os.path.join(bin_dir, 'compiled.zip')

    @staticmethod
    def pack():
        print('packing current js "%s" -> "%s"...' % (Package.js_root, Package.archive))
        file = zipfile.ZipFile(Package.archive, 'w')
        for f in os.listdir(Package.js_root):
            file.write(os.path.join(Package.js_root, f), f)

    @staticmethod
    def unpacked_bin():
        if not os.path.exists(Package.js_root):
            print('unpacking pre-compiled js "%s" -> "%s"...'
                  % (Package.archive, Package.js_root))
            file = zipfile.ZipFile(Package.archive, 'r')
            file.extractall(Package.js_root)
        return Package.bin_dir

def _remove_readonly(fn, path, excinfo):
    os.chmod(path, stat.S_IWRITE)
    fn(path)

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
    shutil.rmtree(dir, onerror=_remove_readonly)

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

snapshot_root = os.path.join(root, 'snapshot')

def make_js_search_dirs(bin):
    return [os.path.join(root, 'test'), src_dir, bin]

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

def _run_compiler(bin_dir, sources, locale, out_dir, timing=False):
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)
    include = ['src/ob', 'src/eberon', 'src/oberon']
    include += [os.path.join(i, locale) for i in include]
    args = [os.path.join(src_dir, 'oc_nodejs.js'), 
            '--include=' + ';'.join([os.path.join(root, i) for i in include]), 
            '--out-dir=%s' % out_dir, 
            '--import-dir=js'
           ]
    if timing:
        args.append('--timing=true') 
    args += sources
    run_node(args, [bin_dir, src_dir], cwd=root)

all_oberon_sources = [
    'ContextAssignment.ob', 
    'EberonSymbols.ob', 
    'EberonContextCase.ob', 'EberonContextExpression.ob',
    'EberonContextIdentdef.ob', 'EberonContextIf.ob',
    'EberonContextInPlace.ob', 'EberonContextProcedure',
    'EberonContextType.ob', 'EberonContextVar.ob', 'EberonLanguageContext.ob',
    'OberonContext.ob', 'OberonContextType.ob', 'OberonContextVar.ob',
    'OberonSymbols.ob', 'Lexer.ob', 'Module.ob']

def build_html(options):
    version = None
    if options.set_version:
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

    if not os.path.exists(out):
        os.mkdir(out)

    link(['oc.js', 'oberon/oberon_grammar.js', 'eberon/eberon_grammar.js', 'test_unit.js'],
         os.path.join(out, 'oc.js'),
         ['src', Package.unpacked_bin(), 'test'],
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

def _recompile_with_replace(locale, skip_tests=False):
    bin_dir = Package.unpacked_bin()
    new_bin = tempfile.mkdtemp(dir=bin_dir)
    try:
        new_js = os.path.join(new_bin, 'js')
        print('recompile all oberon sources to "%s"...' % new_js)
        _run_compiler(bin_dir, all_oberon_sources, locale, new_js)
        if not skip_tests:
            run_tests(new_bin)
        print('replacing: "%s" -> "%s"...' % (new_js, Package.js_root))
        cleanup(Package.js_root)
        os.rename(new_js, Package.js_root)
    finally:
        shutil.rmtree(new_bin)
    print('OK!')

def pre_commit_check(options):
    _recompile_with_replace(options.locale)
    Package.pack()

class compile_target(object):
    name = 'compile'
    description = 'compile oberon source file'

    @staticmethod
    def setup_options(parser):
        parser.add_argument(
            'files', nargs='+', metavar='FILE',
            help='oberon source file(s) to compile')
        parser.add_argument(
            '--out',
            help='output directory, default: "%(default)s"',
            default=default_out_js)

    def __init__(self, options):
        _run_compiler(
            Package.unpacked_bin(), options.files, options.locale, options.out)

class recompile_target(object):
    name = 'recompile'
    description = 'recompile all oberon source files'

    @staticmethod
    def setup_options(parser):
        parser.add_argument(
            '--out',
            help='output directory, default: "%(default)s"',
            default=default_out_js)

    def __init__(self, options):
        _run_compiler(Package.unpacked_bin(), all_oberon_sources,
                      options.locale, options.out)

class self_recompile_target(object):
    name = 'self-recompile'
    description = 'compile and replace itself using current sources'

    @staticmethod
    def setup_options(parser):
        parser.add_argument('--skip-tests', action='store_true',
                            help='do not run test after recompile')

    def __init__(self, options):
        _recompile_with_replace(options.locale, options.skip_tests)

class html_target(object):
    name = 'html'
    description = 'build html page'

    @staticmethod
    def setup_options(parser):
        parser.add_argument('--out', help='output directory, default: "%(default)s"', default='_out')
        parser.add_argument('--set-version', action="store_true", help='include version in built html')

    def __init__(self, options):
        build_html(options)

class tests_target(object):
    name = 'tests'
    description = 'run tests'

    @staticmethod
    def setup_options(parser):
        parser.add_argument('--unit', help='run specific unit test, use "*" to run all unit tests')
        parser.add_argument('--code', help='run specific code generator test, use "*" to run all generator tests')

    def __init__(self, options):
        run_tests(Package.unpacked_bin(), options.unit, options.code)

class pre_commit_target(object):
    name = 'pre-commit'
    description = 'recompile oberon sources, run tests against just recompiled sources, pack compiled sources'

    @staticmethod
    def setup_options(parser):
        pass

    def __init__(self, options):
        pre_commit_check(options)

targets = [compile_target, recompile_target, self_recompile_target, html_target, tests_target, pre_commit_target]

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Build tool')
    parser.add_argument('--locale', help='use specified localization subfolder, default is "%(default)s"', default='en')
    subparsers = parser.add_subparsers(help='targets') 
    for t in targets:
        group = subparsers.add_parser(t.name, help=t.description)
        t.setup_options(group)
        group.set_defaults(func=t)

    args = parser.parse_args()
    args.func(args)
