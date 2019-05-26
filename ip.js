const FS         = require('fs');
const MOMENT     = require('moment');
const JIMP       = require('jimp');

/**
 *
 * A collection of filters used to process a folder of images.
 *
 * Syntax:
 *   node ip.js [foldername] where 
 *
 * Returns:
 *   a folder named 'output' that contains all read images from the aforementioned foldername processed with the filters
 *
 * Currently supports:
 *   -edge detection
 *   -sharpening
 *   -object highlighting in red
 *   -object highlighting in green
 *   -object highlighting in blue
 *   -an attempt at stereoscopic red-blue using the red and blue filter
 *   -an attempt to create a Kuwahara Filter that morphed into something else.  
 *    The implementation normally involves taking the lesser of the average color and
 *    the standard deviation of the color of the northwest, northeast, southwest, and southeastern region of pixels.  However, I
 *    experimented a bit and went with the average of the three pixels in the north, east, south, and western side.  After a little
 *    of playing with the code, I found a result that made textured graphics melt while leaving objects sharpened.  
 * 
 * @author Olin Gallet
 * @date   5/24/2019
 */

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif"];
const OUTPUT_DIR       = "output";
const X_OFFSET         = 50;

let moment = MOMENT();
let imageFiles = [];

if (process.argv.length >= 3 && FS.existsSync(process.argv[2])){
    loadFolder(process.argv[2]);
} else {
    errorHandle(process.argv);
}

/**
 * Loads the folder of the images to be processed and processes them through the subfunctions.
 * @param folder the folder name of input images
 */
function loadFolder(folder){
    console.log(getCurrentTime() + "Loading folder " + folder + ". . .");
    FS.readdirSync(folder).forEach(file => {
        let extension = file.substring(file.lastIndexOf("."));
        if (IMAGE_EXTENSIONS.includes(extension)){
            let name = file.substring(0, file.lastIndexOf("."));
            console.log(getCurrentTime() + "'" + name + extension + "' found.  Processing image...");
             
            JIMP.read(folder + '/' + name + extension).then(function (image) {
                console.log(getCurrentTime() + "> Image is " + image.bitmap.width + "x" + image.bitmap.height + ".");
                
                let originalImage = image.clone();
                
                processEdgeDetect(image, OUTPUT_DIR + "/" + name + "-ed.png");
				processSharpen(image, OUTPUT_DIR + "/" + name + "-sharpen.png");
				processHorrorFilter(image, OUTPUT_DIR + "/" + name + "-horror.png");
                let redImage   = processRedImage(image, OUTPUT_DIR + "/" + name + "-red.png");
                let greenImage = processGreenImage(image, OUTPUT_DIR + "/" + name + "-green.png");
                let blueImage  = processBlueImage(image, OUTPUT_DIR + "/" + name + "-blue.png");
                
                console.log(getCurrentTime() + "> All images R G B filtered out.  Producing composite images...");
                originalImage.composite(blueImage, 0, 0);
                originalImage.composite(redImage, 0, 0);
				originalImage.crop(0,0, originalImage.bitmap.width - 50, originalImage.bitmap.height);
                
                originalImage.write(OUTPUT_DIR + "/" + name + "-composite.png");
                console.log(getCurrentTime() + "> Composite image produced as <" + OUTPUT_DIR + "/" + name + "-composite.png>.");
            }).catch(function (err) {
                console.log(err);
            });   
        }
    });
}

/**
 * Uses edge detect to create a new image. 
 * Convolution matrix is from Wikipedia.
 * @param img      the image 
 * @param filename the filename for the output image
 */
function processEdgeDetect(img, filename){
	let image = img.clone();
    image.convolute([
        [1, 1, 1],
        [1, -8, 1],
        [1, 1, 1]
    ]);
    image.write(filename);
    console.log(getCurrentTime() + '> Edge detection image saved as <' + filename + '>.');
}

/**
 * Uses sharpen to create a new image.
 * Convolution matrix is from Wikipedia.
 * @param img      the image 
 * @param filename the filename for the output image
 */
function processSharpen(img, filename){
	let image = img.clone();
    image.convolute([
        [0, -1, 0],
        [-1, 5, -1],
        [0, -1, 0]
    ]);
    image.write(filename);
    console.log(getCurrentTime() + '> Sharpen image saved as <' + filename + '>.');
}

/** Inspired by https://github.com/adussault/python-kuwahara/blob/master/Kuwahara.py **/
/**
 * Uses a horror filter to create a new image.
 * The algorithm takes the average of the three pixels in the north, east, south, and western side and selects
 * the least value of red, green, and blue then uses that for the pixel value.
 * @param img      the image 
 * @param filename the filename for the output image
 */
 function processHorrorFilter(img, filename){
    let image = img.clone();
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        
           if (isPixelSurrounded(image.bitmap.data, image.bitmap.width, image.bitmap.height, idx, 1)){
			    let northMeanRed   = (image.bitmap.data[idx - (image.bitmap.width * 4) - 4] + image.bitmap.data[idx - (image.bitmap.width * 4)] + image.bitmap.data[idx-(image.bitmap.width * 4) + 4]) / 3
				let northMeanGreen = (image.bitmap.data[idx - (image.bitmap.width * 4) - 3] + image.bitmap.data[idx - (image.bitmap.width * 4) + 1] + image.bitmap.data[idx-(image.bitmap.width * 4) + 5]) / 3
				let northMeanBlue  = (image.bitmap.data[idx - (image.bitmap.width * 4) - 2] + image.bitmap.data[idx - (image.bitmap.width * 4) + 2] + image.bitmap.data[idx-(image.bitmap.width * 4) + 6]) / 3
                
				let eastMeanRed   = (image.bitmap.data[idx - (image.bitmap.width * 4) + 4] + image.bitmap.data[idx + 4] + image.bitmap.data[idx + (image.bitmap.width * 4) + 4]) / 3
				let eastMeanGreen = (image.bitmap.data[idx - (image.bitmap.width * 4) + 5] + image.bitmap.data[idx + 5] + image.bitmap.data[idx + (image.bitmap.width * 4) + 5]) / 3
				let eastMeanBlue  = (image.bitmap.data[idx - (image.bitmap.width * 4) + 6] + image.bitmap.data[idx + 6] + image.bitmap.data[idx + (image.bitmap.width * 4) + 6]) / 3
                
				let southMeanRed   = (image.bitmap.data[idx + (image.bitmap.width * 4) - 4] + image.bitmap.data[idx - (image.bitmap.width * 4)] + image.bitmap.data[idx-(image.bitmap.width * 4) + 4]) / 3
				let southMeanGreen = (image.bitmap.data[idx + (image.bitmap.width * 4) - 3] + image.bitmap.data[idx - (image.bitmap.width * 4) + 1] + image.bitmap.data[idx-(image.bitmap.width * 4) + 5]) / 3
				let southMeanBlue  = (image.bitmap.data[idx + (image.bitmap.width * 4) - 2] + image.bitmap.data[idx - (image.bitmap.width * 4) + 2] + image.bitmap.data[idx-(image.bitmap.width * 4) + 6]) / 3
                
				let westMeanRed   = (image.bitmap.data[idx - (image.bitmap.width * 4) - 4] + image.bitmap.data[idx + (image.bitmap.width * 4)] + image.bitmap.data[idx + (image.bitmap.width * 4) + 4]) / 3
				let westMeanGreen = (image.bitmap.data[idx - (image.bitmap.width * 4) - 3] + image.bitmap.data[idx + (image.bitmap.width * 4) + 1] + image.bitmap.data[idx + (image.bitmap.width * 4) + 5]) / 3
				let westMeanBlue  = (image.bitmap.data[idx - (image.bitmap.width * 4) - 2] + image.bitmap.data[idx + (image.bitmap.width * 4) + 2] + image.bitmap.data[idx + (image.bitmap.width * 4) + 6]) / 3
                
				image.bitmap.data[idx]     = Math.min(northMeanRed, eastMeanRed, southMeanRed, westMeanRed, 100);
                image.bitmap.data[idx + 1] = Math.min(northMeanGreen, eastMeanGreen, southMeanGreen, westMeanGreen, 100);
                image.bitmap.data[idx + 2] = Math.min(northMeanBlue, eastMeanBlue, southMeanBlue, westMeanBlue, 100);
				
                image.bitmap.data[idx + 3] = 255;
           }
         
        
    });
    
    image.write(filename);
    console.log(getCurrentTime() + '> Horror Filter version of image saved as <' + filename + '>.');
    
    return image;
}

/**
 * Highlights objects of interest in red.
 * @param img      the image 
 * @param filename the filename for the output image
 */
function processRedImage(img, filename){
    let image = img.clone();
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        if (isPixelColored(image.bitmap.data, idx)){
           if (isPixelSurrounded(image.bitmap.data, image.bitmap.width, image.bitmap.height, idx, 1)){
                image.bitmap.data[idx] = 255;
                image.bitmap.data[idx + 1] = 0;
                image.bitmap.data[idx + 2] = 0;
                image.bitmap.data[idx + 3] = 255;
           }
        } else {
            image.bitmap.data[idx]     = 0;
            image.bitmap.data[idx + 1] = 0;
            image.bitmap.data[idx + 2] = 0;
            image.bitmap.data[idx + 3] = 0;
        }
        
    });
    
    image.crop(0,0,image.bitmap.width - X_OFFSET,image.bitmap.height);
    
    image.write(filename);
    console.log(getCurrentTime() + '> Red version of image saved as <' + filename + '>.');
    
    return image;
}


/**
 * Highlights objects of interest in green.
 * @param img      the image 
 * @param filename the filename for the output image
 */
function processGreenImage(img, filename){
    let image = img.clone();
    
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
         if (isPixelColored(image.bitmap.data, idx)){
           if (isPixelSurrounded(image.bitmap.data, image.bitmap.width, image.bitmap.height, idx, 1)){
                image.bitmap.data[idx] = 0;
                image.bitmap.data[idx + 1] = 255;
                image.bitmap.data[idx + 2] = 0;
                image.bitmap.data[idx + 3] = 255;
           }
        } else {
            image.bitmap.data[idx]     = 0;
            image.bitmap.data[idx + 1] = 0;
            image.bitmap.data[idx + 2] = 0;
            image.bitmap.data[idx + 3] = 0;
        }
    });
    
    image.crop(0,0,image.bitmap.width - X_OFFSET,image.bitmap.height);
    
    image.write(filename);
    console.log(getCurrentTime() + '> Green version of image saved as <' + filename + '>.');
    
    return image;
}


/**
 * Highlights objects of interest in blue.
 * @param img      the image 
 * @param filename the filename for the output image
 */
function processBlueImage(img, filename){
    let image = img.clone();
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
        if (isPixelColored(image.bitmap.data, idx)){
           if (isPixelSurrounded(image.bitmap.data, image.bitmap.width, image.bitmap.height, idx, 1)){
                image.bitmap.data[idx ] = 0;
                image.bitmap.data[idx + 1] = 0;
                image.bitmap.data[idx + 2] = 255;
                image.bitmap.data[idx + 3] = 255;
           }
        } else {
            image.bitmap.data[idx]     = 0;
            image.bitmap.data[idx + 1] = 0;
            image.bitmap.data[idx + 2] = 0;
            image.bitmap.data[idx + 3] = 0;
        }
    });
    
    image.crop(X_OFFSET,0,image.bitmap.width - X_OFFSET,image.bitmap.height);
    
    image.write(filename);
    console.log(getCurrentTime() + '> Blue version of image saved as <' + filename + '>.');
    return image;
}

/**
 * States if the pixel is surrounded by pixels of interest.  Uses recursion.
 * @param imageData an array of pixel data
 * @param imageWidth the width of the image
 * @param imageHeight the height of the image
 * @param pixel the pixel number in the array
 * @param threshold the amount of depth for pixels around the given pixel
 */ 
function isPixelSurrounded(imageData, imageWidth, imageHeight, pixel, threshold){
    let count    = 0;
    let response = false;
    
    if (threshold === 1){

        if (pixel + 4 < imageWidth * imageHeight * 4 && isPixelColored(imageData, pixel + 4)){
            count = count + 1;
        }                            
        if (pixel - 4 > 0 && isPixelColored(imageData, pixel - 4)){
            count = count + 1;
        }
        
        if (pixel - (imageWidth * 4) > 0 && isPixelColored(imageData, pixel - (imageWidth * 4))){
            count = count + 1;
        }
        if (pixel + (imageWidth * 4) < imageWidth * imageHeight * 4 && isPixelColored(imageData, pixel + (imageWidth * 4))){
            count = count + 1;
        }
 
        response = count >= 2;
    } else {

        if (pixel + (4 * threshold) < imageWidth * imageHeight * 4 && isPixelColored(imageData, pixel + (4 * threshold))){
            count = count + 1;
        }                            
        if (pixel - (4 * threshold) > 0 && isPixelColored(imageData, pixel - (4 * threshold))){
            count = count + 1;
        }
        
        if (pixel - (imageWidth * 4 - threshold) > 0 && isPixelColored(imageData, pixel - (imageWidth * 4) + threshold)){
            count = count + 1;
        }
        if (pixel + (imageWidth * 4 + threshold) < imageWidth * imageHeight * 4 && isPixelColored(imageData, pixel + (imageWidth * 4) + threshold)){
            count = count + 1;
        }

        response = count >= 2 && isPixelSurrounded(imageData, imageWidth, imageHeight, pixel, threshold - 1);
    }
    
    return response;
}

/**
 * States if the image meets a certain threshold to be identified.
 * @param imageData the array of pixel data
 * @param pixel     the pixel number in the array
 * @return true if the pixel has red, green, and blue or at least 100, else false
 */
function isPixelColored(imageData, pixel){
   return imageData[pixel] > 100 || imageData[pixel + 1] > 100 || imageData[pixel + 2] > 100;
}

/**
 * Reports any errors found in command syntax.
 * @param args the args from the command
 */
function errorHandle(args){
    console.log("Error loading from folder.");
    if (args.length >= 3){
        console.log("Folder not found or could not be read.");
    } else {
        console.log("No folder name found; check arguments.");
    }
}

/**
 * Gets the current time enclosed in braces('[]') in HH:mm format where HH is hours and mm is minutes.
 * @return the current time enclosed in braces('[]') in HH:mm format where HH is hours and mm is minutes
 */
function getCurrentTime(){
    return '[' + moment.format("HH:mm") + '] ';
}