#!/usr/bin/env python
'''
Objective:

from a blogger link, get

title
author
date
keywords
'''

import sys,os,traceback
from BeautifulSoup import BeautifulStoneSoup as stoned
from urllib import urlopen
from collections import *
execfile('cached_invoke.py')
execfile('url_routines.py')

def Print(*args):
	for a in args:
		try:
			sys.stdout.write(a)
		except:
			sys.stdout.write(str(a))
	sys.stdout.flush()

by_author = defaultdict(list)

def print_by_author():
	for k in by_author.keys():
		Print(k,'\n')
		for entry in by_author[k]:
			Print('\tURL \t=\t ',entry['url'],'\n')
			Print('\tTitle \t=\t ',entry['title'],'\n')
			Print('\tDate \t=\t ',entry['date'],'\n')
			Print('\tLabels \t=\t ')
			for e in entry['keywords']:
				Print(e,', ')
			Print('\n\n')
'''
def print_all():
	for k in by_author.keys():
		Print(k,'\n')
		for entry in by_author[k]:
			Print('\tURL \t=\t ',entry['url'],'\n')
			Print('\tTitle \t=\t ',entry['title'],'\n')
			Print('\tDate \t=\t ',entry['date'],'\n')
			Print('\tLabels \t=\t ')
			for e in entry['keywords']:
				Print(e,', ')
			Print('\n\n')
'''

@disk_cached
def extract_metadata(*urlparts):
	site = stoned(get_url_as_soup(*urlparts))
	title = 'Untitled'
	auth  = 'Unknown'
	date  = 'Unknown'
	keys  = 'None'
	for s in site.findAll('h3'):
		info = dict(s.attrs)
		if 'class' in info and info['class']=='post-title':
			for a in s.findAll('a'):
				title = a.contents[0]
	for s in site.findAll('span'):
		info = dict(s.attrs)
		if 'class' in info:
			if info['class']=='post-author':
				auth = ' '.join(' '.join(' '.join(' '.join(s.contents).split()).split('Posted by ')).split())
			if info['class']=='post-timestamp':
				for a in s.findAll('a'):
					date = a.contents[0]
			if info['class']=='post-labels':
				keys = ', '.join([a.contents[0] for a in s.findAll('a')])
	return (('title',str(title)),('date',str(date)),('keywords',str(keys)),('url',str(parts2url(*urlparts))))
	
	
for url in sys.stdin.readlines():
	url = str(url[:-1])
	print url
	title = 'Untitled'
	auth  = 'Unknown'
	date  = 'Unknown'
	keys  = 'None'
	try:
		urlok=0
		if url[:11]=='http://www.':
			path = url[11:]
			part = path.split('/')
			if part[1].isdigit() and part[2].isdigit():
				urlok = 1
		if not urlok:
			continue
		it = extract_metadata(*url2parts(url))
		print it
		by_author[auth].append(dict(it))
	except:
		traceback.print_exc()

#print_by_author()

for author in by_author.keys():
	for entry in by_author[author]:
		entry.update({'author':author})
		Print(str(entry))
		Print('\n\n')

#import pickle
#pickle.dump(by_author,open('bloginfo.txt','wb'))

'''
<h3 class='post-title'>
<a href='http://www.wealoneonearth.blogspot.com/2010/10/portrait-of-city-as-squiggly-line.html'>A Portrait of the City as a Squiggly Line</a>
</h3>

<span class='post-author'>
Posted by
Fedor Manin
</span>
<span class='post-timestamp'>
at
<a class='timestamp-link' href='http://www.wealoneonearth.blogspot.com/2010/10/portrait-of-city-as-squiggly-line.html' title='permanent link'>1.10.10</a>
</span>
<span class='post-labels'>
Labels:
<a href='http://www.wealoneonearth.blogspot.com/search/label/cities' rel='tag'>cities</a>,
<a href='http://www.wealoneonearth.blogspot.com/search/label/politics' rel='tag'>politics</a>
</span>
'''

'''
tovisit = set(['http://%s/'%mainurl])
visited = set()

while len(tovisit):
	url = list(tovisit)[0]
	for a in stoned(urlopen(url).read()).findAll('a'):
		inf = dict(a.attrs)
		if 'href' in inf:
			s = inf['href']
			if not mainurl in s or any(k in s for k in ['javascript:void(0)','/search/label/','#comment-form','search?updated-']):
				continue
			if not s in visited:
				tovisit.add(s)
	tovisit.remove(url)
	visited.add(url)
	print url
	sys.stdout.flush()

'''
