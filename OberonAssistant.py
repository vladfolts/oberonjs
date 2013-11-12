import sublime, sublime_plugin

class OberonAssistant(sublime_plugin.EventListener):
	rs = {}
	inProcess = False

	keywords = ['ARRAY', 'IMPORT', 'THEN', 'BEGIN', 'IN', 'TO', 'BY', 'IS', 'TRUE', 'CASE', 'MOD', 'TYPE', 'CONST', 'MODULE', 'UNTIL', 'DIV', 'NIL', 'VAR', 'DO', 'OF', 'WHILE', 'ELSE', 'OR', 'ELSIF', 'POINTER', 'END', 'PROCEDURE', 'FALSE', 'RECORD', 'FOR', 'REPEAT', 'IF', 'RETURN', 'ABS', 'ASR', 'ASSERT', 'BOOLEAN', 'BYTE', 'CHAR', 'CHR', 'DEC', 'EXCL', 'FLOOR', 'FLT', 'INC', 'INCL', 'INTEGER', 'LEN', 'LSL', 'NEW', 'ODD', 'ORD', 'PACK', 'REAL', 'ROR', 'SET', 'UNPK']

	def on_modified(self,view):
		if len(view.sel())==1 and not self.inProcess:
			if self.rs != {}:
				self.rs = view.sel()
				curr = self.rs[0]
				scope = view.scope_name(curr.a)
				if not "oberon" in scope or "string" in scope or "comment" in scope:
					return
				ch = view.substr(sublime.Region(curr.a-1,curr.a))
				if ch==" " or ch=="\n" or ch==";" or ch=="(" or ch==")" :
					word = view.substr(view.word(sublime.Region(curr.a-1,curr.a-1)))
					shift = 1
					if ")" in word :
						word = view.substr(view.word(sublime.Region(curr.a-2,curr.a-2)))
						sublime.status_message(word)
						shift = 2					
					if word.upper() in self.keywords:
						edit = view.begin_edit()
						view.replace(edit, view.word(sublime.Region(curr.a-shift,curr.a-shift)), word.upper())
						self.inProcess = True
						view.end_edit(edit)
						self.inProcess = False
			else:
				self.rs = view.sel()

	def on_selection_modified(self,view):
			self.rs = view.sel()
			curr = self.rs[0]
			#sublime.status_message(view.scope_name(curr.a))

