#!/usr/bin/env bash

./maketree.py
git add --all
git add . 
git add -u :/
git commit -m "updated website"
git push -u origin master
