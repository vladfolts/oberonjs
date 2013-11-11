import sublime, sublime_plugin

class OberonAssistant(sublime_plugin.EventListener):
	rs = {}
	inProcess = False

	keywords = ['ARRAY', 'IMPORT', 'THEN', 'BEGIN', 'IN', 'TO', 'BY', 'IS', 'TRUE', 'CASE', 'MOD', 'TYPE', 'CONST', 'MODULE', 'UNTIL', 'DIV', 'NIL', 'VAR', 'DO', 'OF', 'WHILE', 'ELSE', 'OR', 'ELSIF', 'POINTER', 'END', 'PROCEDURE', 'FALSE', 'RECORD', 'FOR', 'REPEAT', 'IF', 'RETURN', 'ABS', 'ASR', 'ASSERT', 'BOOLEAN', 'BYTE', 'CHAR', 'CHR', 'DEC', 'EXCL', 'FLOOR', 'FLT', 'INC', 'INCL', 'INTEGER', 'LEN', 'LSL', 'NEW', 'ODD', 'ORD', 'PACK', 'REAL', 'ROR', 'SET', 'UNPK']

	def on_modified(self,view):
		if view.settings().get('syntax') != "Packages/Oberon/Oberon.tmLanguage":
			return
		if len(view.sel())==1 and not self.inProcess:
			if self.rs != {}:
				self.rs = view.sel()
				curr = self.rs[0]
				ch = view.substr(sublime.Region(curr.a-1,curr.a))
				if ch==" " or ch=="\n" or ch==";" or ch=="(" :
					word = view.substr(view.word(sublime.Region(curr.a-1,curr.a-1)))					
					if word.upper() in self.keywords:
						edit = view.begin_edit()
						view.replace(edit, view.word(sublime.Region(curr.a-1,curr.a-1)), word.upper())
						self.inProcess = True
						view.end_edit(edit)
						self.inProcess = False
			else:
				self.rs = view.sel()

	def on_selection_modified(self,view):
			self.rs = view.sel()

