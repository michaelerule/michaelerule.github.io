'''
Computations of the form x*=b
Where x is an integer and b is a decimal
can be re-written as 
x = (x*L)>>L;
This approximation may be exact when x has a limited range. 
This code assumes x is a signed integer.
'''


