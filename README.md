# imageprocessing
A node.js script for batch processing of images.  On successful use, a directory called 'output' will
be created in the calling directory containing all images ('.png', '.gif', and '.jpg') modified.

Currently supports:

* Sharpening

* Edge Detection

* Object Highlighting in Red, Green, and Blue

* Stereoscoping Attempt Through Composited Images

* An "Inspired by the Kuwahara Filter" Using Average Bounding Pixels

Feel free to add your own for your needs.

The syntax is as follows:

  `node ip.js [input-directory]`
  
  where `[input-directory]` is the directory of all the images you want to process.
  
