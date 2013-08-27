#!/usr/bin/python

from optparse import OptionParser
import os
import re
import sys

def extract_require(s):
	m = re.search('(//)?(.*)require\\("(.*)"\\)', s)
	if not m or m.group(1):
		return None
	prefix = m.group(2)
	if prefix and len(prefix):
		prefix = prefix[-1]
		if prefix.isalpha() or prefix.isdigit() or prefix == '_':
			return None
	return m.group(3)

def resolve_path(file, dirs):
	if os.path.isabs(file):
		return file

	for d in dirs:
		result = os.path.join(d, file)
		if os.path.exists(result):
			return result
	raise Exception('cannot find "%s" in "%s"' % (file, dirs))

def process(path, out, resolved, resolving, dirs):
	module_name = os.path.splitext(os.path.basename(path))[0]
	if module_name in resolving:
		raise Exception('cyclic import detected: "%s"' % module_name)
	result = 'imports["%s"] = {};\n' % path
	result += '(function %s(exports){\n' % module_name
	src_path = resolve_path(path, dirs)
	with open(src_path) as f:
		for l in f:
			req = extract_require(l)
			if req and not req in resolved:
				try:
					process(req, out, resolved, resolving + [module_name], dirs)
				except Exception:
					print('while resolving "%s"...' % module_name)
					raise sys.exc_info()[1]
			result += l
	result += '\n})(imports["%s"]);\n' % path
	out.write(result)
	resolved += [path]

def encode_to_js_string(s):
	escape = [('\n', '\\n'), ('\r', '\\r'), ('"', '""')]
	for e in escape:
		s = s.replace(e[0], e[1])
	return '"%s"' % s

def link(input_path, output_path, dirs, version = None):
	with open(output_path, "w") as out:
		prolog = ""
		if not version is None:
			prolog += 'var buildVersion = %s;\n' % encode_to_js_string(version)
		prolog += "var imports = {};\n"
		prolog += 'function require(module){return imports[module];}\n'
		out.write(prolog)
		process(input_path, out, [], [], dirs)

def parse_args(args):
	parser = OptionParser('Usage: linkjs.py [options] <input js> <output js>')
	parser.add_option('-I', '--include', action='append', metavar='<directory>',
					  default=[],
                      help='additional search directory')
	opts, args = parser.parse_args(args)
	if len(args) != 2:
		parser.print_help()
		sys.exit(-1)
	return args[0], args[1], opts.include

if __name__ == '__main__':
	src, dst, include = parse_args(sys.argv[1:])
	link(src, dst, include + ['.'])

