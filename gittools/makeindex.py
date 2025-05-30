#!/usr/bin/python
# -*- coding: UTF-8 -*-
from __future__ import absolute_import
from __future__ import with_statement
from __future__ import division
from __future__ import print_function

'''
Python code to rebuild the index, sice github pages doesn't provide
browsing links automatically
'''

import os,sys
#eg = [e for e in os.listdir('./examples/') if '.html' in e]

template = '''
<html>
<head>
</head>
<body>
<h3>Index of %(foldername)s</h3>
%(content)s
</body>
</html>
'''

foldername = os.path.relpath(".","..")#os.getcwd()

import locale
from functools import cmp_to_key
import re
def natural_key(string_):
    """See http://www.codinghorror.com/blog/archives/001018.html"""
    return [int(s) if s.isdigit() else s for s in re.split(r'(\d+)', string_)]

content = ""
for root,dirs,files in os.walk('.'):
    if root[:3]=='./.': continue
    if root=='.': continue
    print(root,dirs,files)
    # Run this script from the subdirectory?
    content += "<h4>%s</h4>"%root
    for file in sorted(files,key=natural_key):
        if file[0]=='.': continue
        print(file)
        content+=\
        '<a href="%(root)s/%(file)s">%(file)s</a><br/>'%globals()

with open("index.html", "w") as index:
    index.write(template%globals())

print("done")
