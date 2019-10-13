#!/bin/bash
#set -x 

# Shows you the largest objects in your repo's pack file.
# Written for osx.
#
# @see http://stubbisms.wordpress.com/2009/07/10/git-script-to-show-largest-pack-objects-and-trim-your-waist-line/
# @author Antony Stubbs
# git filter-branch -f --index-filter "git rm -rf --cached --ignore-unmatch FOLDERNAME" -- --all
# git filter-branch --index-filter "git rm -rf --cached --ignore-unmatch $files" HEAD
# set the internal field spereator to line break, so that we can iterate easily over the verify-pack output
IFS=$'\n';

# list all objects including their size, sort by size, take top 10
objects=`git verify-pack -v .git/objects/pack/pack-*.idx | grep -v chain | sort -k3nr | head`

echo "All sizes are in kB. The pack column is the size of the object, compressed, inside the pack file."

output="size,pack,SHA,location"
for y in $objects
do
	# extract the size in bytes
	size=$((`echo $y | cut -f 5 -d ' '`/1024))
	# extract the compressed size in bytes
	compressedSize=$((`echo $y | cut -f 6 -d ' '`/1024))
	# extract the SHA
	sha=`echo $y | cut -f 1 -d ' '`
	# find the objects location in the repository tree
	other=`git rev-list --all --objects | grep $sha`
	#lineBreak=`echo -e "\n"`
	output="${output}\n${size},${compressedSize},${other}"
done

echo -e $output | column -t -s ', '


# Clean up editor and temp files from the local directory (even if not 
# tracked by git)
echo "Deleting editor temporary files"
find . -name "*.pyc" -exec rm -rf {} \; 2>/dev/null
find . -name "*~" -exec rm -rf {} \;  2>/dev/null

# Add any new files, add all updates to all files

echo "Adding all changes"
git add --all . 
git add -u :/

# Commit using the message specified as first argument to this script

echo "Git commit"
git commit -m "git broke"

git filter-branch -f --index-filter "git rm -rf --cached --ignore-unmatch 20170418_Rule_ANC_Edinburgh_talk.pdf" HEAD
git filter-branch -f --index-filter "git rm -rf --cached --ignore-unmatch RuleEtAl_SfN2015_11.pdf" HEAD
git filter-branch -f --index-filter "git rm -rf --cached --ignore-unmatch out0.gif" HEAD
git filter-branch -f --index-filter "git rm -rf --cached --ignore-unmatch 3.gif" HEAD
git filter-branch -f --index-filter "git rm -rf --cached --ignore-unmatch __get_url_as_soup_cache.zip" HEAD

rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now
git gc --aggressive --prune=now

