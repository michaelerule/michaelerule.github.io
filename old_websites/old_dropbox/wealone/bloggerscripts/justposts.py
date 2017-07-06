#!/usr/bin/env python
#encoding=utf8
'''
blog crawl gets _all_ links
this script throws out the ones that aren't individual posts, heuristically.

http://domain/year/month/title.html

cat mf_posts.txt | ./justposts.py | ./blogstat.py

'''

import sys,os

for url in sys.stdin.readlines():
	url = url[:-1]
	if url[:11]=='http://www.':
		path = url[11:]
		part = path.split('/')
		if part[1].isdigit() and part[2].isdigit():
			print url



