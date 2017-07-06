#!/usr/bin/env python
'''

Uses blog posts to train markov text model

./blogcrawl.py | ./justposts.py | ./markov.py

'''

import sys,os
from BeautifulSoup import BeautifulStoneSoup as stoned
from urllib import urlopen

execfile('cached_invoke.py')
execfile('url_routines.py')

def stripTags(s):
	out = []
	state = 0
	for c in s:
		if c=='<':
			state = 0
			continue
		if c=='>':
			state = 1
			continue
		if state:
			out.append(c)
	out = ''.join(out)
	out = ' '.join(out.split())
	return out


'''
blogcrawl.py | ./justposts.py | ./markov.py
'''

import sys,os

def _get_url_as_soup(*parts):
	try:
		url = 'http://' + '/'.join(parts)
		return urlopen(url).read()
	except:
		print parts

for url in sys.stdin.readlines():
	try:
		xx = url.split('//')
		s = _get_url_as_soup(*(xx[0].split('/')))
		w = stripTags(s)
		body = w.split('Build instructions for hallucinogenic visor kit')[1].split('Email This')[0]
		print body
	except:
		pass



