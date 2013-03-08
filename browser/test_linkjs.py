from linkjs import extract_require
import unittest

class Test(unittest.TestCase):
	def test_extract_require(self):
		self.assertEqual(extract_require('require("test.js")'), 'test.js')
		self.assertEqual(extract_require('var test = require("../test.js");'), '../test.js')
		self.assertEqual(extract_require('//var test = require("test.js");'), None)
		self.assertEqual(extract_require('Another_require("test.js");'), None)

if __name__ == '__main__':
    unittest.main()