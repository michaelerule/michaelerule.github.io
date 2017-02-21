#!/usr/bin/env bash

./makeindex.py
git add --all
git commit -m "updated website"
git push -u origin master
