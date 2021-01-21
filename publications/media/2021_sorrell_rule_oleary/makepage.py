#!/usr/bin/env ipython3

from pylab import *

import sys,os

html = '''
<html><head></head><body>
(thumbnails; click to download .svg or high resolution version)
<br/>
'''

use = [f for f in os.listdir('.') if '.svg' in f or '.png' in f]

print(len(use))

for u in use:
    th = './thumbnails/'+u.split('.')[0]+'_thumbnail.png'
    html += '\n<a href="./%s"><img src="%s" title="%s"/></a>'%(u,th,u)

html += "\n</body></html>"

with open("sorrell_rule_2021_thumbnails.html", "w") as text_file:
    text_file.write(html)
