#!/usr/bin/python

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

def resolve_require(req, out, resolved, resolving, dir):
	if not os.path.exists(os.path.join(dir, req)):
		raise Exception('cannot resolve "%s"' % req)
	process(req, out, resolved, resolving, dir)

def process(path, out, resolved, resolving, dir):
	module_name = os.path.splitext(os.path.basename(path))[0]
	if module_name in resolving:
		raise Exception('cyclic import detected: "%s"' % module_name)
	result = 'imports["%s"] = {};\n' % path
	result += '(function %s(exports){\n' % module_name
	with open(os.path.join(dir, path)) as f:
		for l in f:
			req = extract_require(l)
			if req and not req in resolved:
				try:
					resolve_require(req, out, resolved, resolving + [module_name], dir)
				except Exception:
					print('while resolving "%s"...' % module_name)
					raise sys.exc_info()[1]
			result += l
	result += '\n})(imports["%s"]);\n' % path
	out.write(result)
	resolved += [path]

def link(input_path, output_path, dir):
	with open(output_path, "w") as out:
		prolog = "var imports = {};\n"
		prolog += 'function require(module){return imports[module];}\n'
		out.write(prolog)
		process(input_path, out, [], [], dir)

if __name__ == '__main__':
	if len(sys.argv) != 3:
		raise Exception("Usage: linkjs.py <input js> <output js>")

	link(sys.argv[1], sys.argv[2], '.')

