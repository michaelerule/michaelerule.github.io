#!/usr/bin/env python
#encoding=utf8

import sys,os
import inspect
import pickle

def ensure_dir(d):
	if not os.path.exists(d):
		os.makedirs(d)			

#decorator
def disk_cached(f):
	def g (*args,**kwargs):
		return cached_invoke(f,*args,**kwargs)
	g.__name__ = 'cached_'+f.__name__
	return g
	
def get_cachename(fname,*arg):
	cachedir = '.'
	var      = '__' + fname + '_cache'
	for i in range(len(arg)):
		cachedir = cachedir + '/' + var
		ensure_dir(cachedir)
		if hasattr(var, '__call__'):
			var = arg.__name__
		else:
			var = str(arg[i])
	cachename = fname;
	for i in range(len(arg)):
		cachename = cachename + '_' + str(arg[i])
	cachename = cachedir + '/' + cachename + '.mat'
	return cachename

def cached_invoke(f,*arg,**kwargs):
	'''
	cached_invoke is a way of memoizing large functions
	All arguments should be integers or strings -- the sort of thing you'd
	want to see in a file name.
	These arguments will be used to build a .mat file containg the output
	of fname called on the arguments.
	If fname requires large amounts of data, as is likely if you've found need
	of this functionality, I suggest having fname load this data from disk.
	If you require parameterization over a finite number of values of type
	that is neither integer nor string, I suggest passing an index to an array
	stored on dist.
	This caching function should only be used for truly massive computation
	where loading arguments from disk (slow) is acceptable.
	As fname is a unique identifier for your function, it is good practice
	to change the function name when you change the code of the function.
	Otherwise, previously cached invokation of the function might be returned,
	causing confusion.
	The default cache location is the local directory.
	'''
	if not 'quiet' in kwargs:
		 kwargs['quiet']=True
	fname = f if type(f) is str else f.__name__
	cachename = get_cachename(fname,*arg)
	if not 'quiet' in kwargs or not kwargs['quiet']:
		print cachename,
	try:
		if 'invalidate' in kwargs and kwargs['invalidate']:
			raise Error()
		varargout = []
		with open(cachename,'rb') as f:
			varargout = pickle.load(f)
		if not 'quiet' in kwargs or not kwargs['quiet']:
			print 'found'
	except:
		if type(f) is str:
			if not 'quiet' in kwargs or not kwargs['quiet']:
				print 'is missing'
			return None
		else:
			if not 'quiet' in kwargs or not kwargs['quiet']:
				print 'computing...',
			varargout = f(*arg)
			with open(cachename,'wb') as f:
				pickle.dump(varargout,f)
	return varargout


