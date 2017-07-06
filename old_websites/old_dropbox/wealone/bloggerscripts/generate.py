#!/usr/bin/env python
#encoding=utf8
'''
Take post metadata and build summary navigation website

cat th_posts.txt | ./justposts.py | ./blogstat.py | ./generate.py
'''

import sys,os,traceback
from collections import *
execfile('cached_invoke.py')

css ='''
.postbox {
	-moz-border-radius: 4px;
	border-radius: 4px;  
	color: #000;
	background-color: #ddd;
	border-color: #999;
	padding: 2px;
	margin: 1px; 
	border-style:solid;
	border-width:1px;
	text-decoration:none;
	text-align:left;
	display: inline-block;
    *display: inline;
	font-size: 100%;
}
.vpostbox {
	-moz-border-radius: 4px;
	border-radius: 4px;  
	color: #000;
	background-color: #ddd;
	border-color: #999;
	padding: 2px;
	margin: 1px; 
	border-style:solid;
	border-width:1px;
	text-decoration:none;
	text-align:left;
	display: inline-block;
    *display: inline;
	font-size: 100%;
}
ul{list-style-type:none;}
ul li{display:inline-block;}
.authorbox {
	-moz-border-radius: 6px;
	border-radius: 6px;  
	color: #fff;
	background-color: #777;
	border-color: #ddd;
	padding: 5px;
	margin: auto;
	border-style:solid;
	border-width:1px;
	width: auto;
	text-align:left;
}
.subauthorbox {
	-moz-border-radius: 4px;
	border-radius: 4px;  
	color: #000;
	background-color: #ccc;
	border-color: #999;
	padding: 2px;
	margin: 1px; 
	border-style:solid;
	border-width:1px;
	text-decoration:none;
	text-align:left;
	display: inline-block;
    *display: inline;
	font-size: 100%;
}
p {
	padding: 0px;
	margin: 0px ;
}
.postbox:hover {
	background-color: #ccc;
}
.vpostbox:hover {
	background-color: #ccc;
}
h3 {
	padding: 0px;
	margin: 0px ;
	font-size: 110%;
}
.date {
	padding: 0px;
	margin: 0px ;
	font-size: 70%;
}
body {
  background:#FFFFFF;
  background-image: url("http://img.photobucket.com/albums/v234/MRule7404/frac5.jpg");
  background-repeat: repeat-y;
  background-attachment: fixed;
  margin:0;
  font: x-small "Trebuchet MS", Trebuchet, Verdana, Sans-serif;
  text-align: center;
}
a:link {
  color:#004488;
  text-decoration:none;
}
a:visited {
  color:#666044;
  text-decoration:none;
}
a:hover {
  color:#445644;
  text-decoration:none;
}
a img {
  border-width:0;
}
/* Outer-Wrapper
----------------------------------------------- */
#wrapb1 {
  margin:0 auto;
  text-align:left;
  width: 870px;
  border-right-style: solid; 
  border-right-color: #f8f8f8; 
  border-right-width: 1px; 
  border-left-style: solid; 
  border-left-color: #f8f8f8; 
  border-left-width: 1px; 
}
#wrapb2 {
  width: 868px;
  border-right-style: solid; 
  border-right-color: #f0f0f0; 
  border-right-width: 1px; 
  border-left-style: solid; 
  border-left-color: #f0f0f0; 
  border-left-width: 1px; 
}
#wrapb3 {
  width: 866px;
  border-right-style: solid; 
  border-right-color: #e0e0e0; 
  border-right-width: 1px; 
  border-left-style: solid; 
  border-left-color: #e0e0e0; 
  border-left-width: 1px; 
}
#wrapb4 {
  width: 864px;
  border-right-style: solid; 
  border-right-color: #d8d8d8; 
  border-right-width: 1px;
  border-left-style: solid; 
  border-left-color: #d8d8d8; 
  border-left-width: 1px; 
}
#wrapb5 {
  width: 862px;
  border-right-style: solid; 
  border-right-color: #d0d0d0; 
  border-right-width: 1px; 
  border-left-style: solid; 
  border-left-color: #d0d0d0; 
  border-left-width: 1px; 
  margin:0 auto;
  text-align:left;
  background : #ffffff;
}

#outer-wrapper {
  width: 860px;
  margin:0 auto;
  padding:10px;
  text-align:left;
  background : #ffffff;
}

#main-wrapper {
  margin:0 auto;
  width: 580px;
  float: left;
  word-wrap: break-word;
  overflow: hidden;
}

#content-wrapper {
	margin:0 auto;
	width: 790px;
	margin:0 auto;
	padding:10px;
	text-align:left;
}
'''

template = '''
<htlm>
<head>
<link href='data:image/x-icon;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QAAAAAAAD5Q7t/AAAAz0lEQVQ4y5WT0Q2DMAxED6lbGdFZWnWHKB4gVQfyD38gsgQM4/6QEKIkAktIQPyOy+EAlRrHUQEoAN3vr1UKioiKyDWhFCQi3bbtdBnLdSHmuBiLiKIDEQkCoXRnjhclV0SkRJTDJ+bRyqMfngCAZZ6qPV2i1qULxrIOPcVn5xy892mPAuiKDoxl/bxfl/5adQvrura+Xg4kdxFCbDFVB8s8xRC99/dCJCJl5tg0Lx6/r8u3cDD5IDUmMcL5IJ1GOYgUJvHemTCWr4MtoRb4B1ZXxk4rM6STAAAAAElFTkSuQmCC' rel='icon' type='image/x-icon'/>
<style type="text/css">
%(css)s
</style>
</head>
<body>
<div id='wrapb1'>
<div id='wrapb2'>
<div id='wrapb3'>
<div id='wrapb4'>
<div id='wrapb5'>
<div id='wrap2'>
<div id='content-wrapper'>
%(body)s
</div>
</div>
</div>
</div>
</div>
</div>
</body>
</html>
'''

postframe = '<a href="%(url)s"><span class="postbox">%(title)s<div class="date">%(date)s</div></span></a>'
postframe = '<a href="%(url)s"><span class="postbox">%(title)s</span></a>'
subauthorpostframe = '<a href="%(url)s"><span class="vpostbox">%(title)s</span></a>'

authorframe = '<div class="authorbox"><h3>%(author)s</h1>%(content)s</div>'
subauthorframe = '<span class="subauthorbox"><h3>%(author)s</h1>%(content)s</span>'

post_infos = []

for line in sys.stdin.readlines():
	try:
		post = eval(line)
		if type(post) is dict:
			post['author'] = post['author'].title()
			post['title'] = post['title'].title()
			post_infos.append(post)
	except:
		traceback.print_exc()

by_author = defaultdict(list)

for post in post_infos:
	try:
		by_author[post['author']].append(post)
	except:
		traceback.print_exc()

def make_frames(post_infos,template=postframe):
	post_frames = []
	for post in post_infos:
		try:
			formatted = template%post
			post_frames.append(formatted)
		except:
			traceback.print_exc()
	return post_frames

short_authors = {}

author_blocks = []
for author in sorted(list(by_author.keys())):
	posts = by_author[author]
	if len(posts)>3:
		content  = ''.join(make_frames(posts))
		block = authorframe%{'author':author,'content':content}
		author_blocks.append(block)
	else:
		short_authors[author]=posts

lazy_author_blocks = []
for author in sorted(list(short_authors.keys())):
	posts = short_authors[author]
	content  = ''.join(make_frames(posts,subauthorpostframe))
	block = subauthorframe%{'author':author,'content':content}
	lazy_author_blocks.append(block)

occasional_authors = authorframe%{'author':'Guest Authors','content':''.join(lazy_author_blocks)}
author_blocks.append(occasional_authors)

body = ''.join(author_blocks)

#post_frames = make_frames(post_infos)
#body = ''.join(post_frames)

page = template%{'body':body,'css':css}

def Print(*args):
	for a in args:
		try:
			sys.stdout.write(a)
		except:
			traceback.print_exc()
			try:
				sys.stdout.write(a.encode('utf-8'))
			except:
				traceback.print_exc()
	sys.stdout.flush()

Print(page)


