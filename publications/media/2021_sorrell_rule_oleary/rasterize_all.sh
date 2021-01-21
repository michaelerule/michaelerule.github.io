#!/usr/bin/env bash

mkdir -p ./thumbnails
mv *thumb* ./thumbnails/


for IMGNAME in ./*.png; do
    echo $IMGNAME
    BASENAME="${IMGNAME%.*}"
    echo $BASENAME
    THUMBNAME="${BASENAME}_thumbnail"
    echo $THUMBNAME

    # Make thumbnail sized
    
    convert -define png:size=300x300 $BASENAME.png -thumbnail '200x200>' \
          -background white -gravity center -extent 220x220 $THUMBNAME.png

    # hack to color-quantize PNG; maybe a better way
    convert $THUMBNAME.png -background white -alpha remove $THUMBNAME.gif
    convert $THUMBNAME.gif $THUMBNAME.png
    rm $THUMBNAME.gif
    
    echo ==================================
done

for IMGNAME in ./*.svg; do
    echo $IMGNAME
    BASENAME="${IMGNAME%.*}"
    echo $BASENAME

    THUMBNAME="${BASENAME}_thumbnail"
    echo $THUMBNAME

    #cairosvg $IMGNAME -o $BASENAME.pdf
    inkscape --file=$BASENAME.svg --export-area-drawing --without-gui --export-pdf=$THUMBNAME.pdf

    inkscape -z --export-dpi 1200 -e $THUMBNAME.png  $THUMBNAME.pdf
    rm $THUMBNAME.pdf

    # Make thumbnail sized
    
    convert -define png:size=300x300 $THUMBNAME.png -thumbnail '200x200>' \
          -background white -gravity center -extent 220x220 $THUMBNAME.png

    # hack to color-quantize PNG; maybe a better way
    convert $THUMBNAME.png -background white -alpha remove $THUMBNAME.gif
    convert $THUMBNAME.gif $THUMBNAME.png
    rm $THUMBNAME.gif
    
    echo ==================================
done

mkdir -p ./thumbnails
mv *thumb* ./thumbnails/


