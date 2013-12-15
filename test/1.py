i = 3

def f1():
	i = 1
	def f2():
		global i
		i = 2
		print(i)

	f2()
	print(i)

f1()
print(i)