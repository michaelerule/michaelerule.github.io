#!/usr/bin/env python

import sys,os
from BeautifulSoup import BeautifulStoneSoup as stoned
from urllib import urlopen
execfile('cached_invoke.py')
execfile('url_routines.py')

if len(sys.argv)>1:
	mainurl = sys.argv[1]
	print mainurl
else:
	mainurl = 'www.wealoneonearth.blogspot.com'

tovisit = set(['http://%s/'%mainurl])
visited = set()

@disk_cached
def get_links(*urlparts):
	tovisit = set()
	for a in stoned(get_url_as_soup(*urlparts)).findAll('a'):
		inf = dict(a.attrs)
		if 'href' in inf:
			s = inf['href']
			if not mainurl in s or any(k in s for k in ['javascript:void(0)','/search/label/','#comment-form','search?updated-']):
				continue
			if not s in visited:
				tovisit.add(s)
	return list(tovisit)

while len(tovisit):
	url = list(tovisit)[0]
	try:
		tovisit.update(get_links(*url2parts(url)))
		tovisit.remove(url)
		visited.add(url)
		print url
	except:
		pass	
sys.stdout.flush()


