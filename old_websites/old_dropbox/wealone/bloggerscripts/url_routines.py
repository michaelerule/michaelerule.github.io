#!/usr/bin/env python

import sys,os
from BeautifulSoup import BeautifulStoneSoup as stoned
from urllib import urlopen
execfile('cached_invoke.py')

def url2parts(url):
	if url[:7].lower()=='http://':
		url=url[7:]
	url = url.split('/')
	url = [s for s in url if len(s)]
	return url

def parts2url(*parts):
	return 'http://' + '/'.join(parts)

def soupy_url(url):
	return stoned(get_url_as_soup(*url2parts(url)))

@disk_cached
def get_url_as_soup(*parts):
	try:
		url = 'http://' + '/'.join(parts)
		return urlopen(url).read()
	except:
		print parts
