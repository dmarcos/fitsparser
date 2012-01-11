
// DataView API wrapper. String -> ArrayBuffer converter
// Author: Diego Marcos
// Email: diego.marcos@gmail.com

define('binaryDataView',[],function () {

  var BinaryDataView = function(binaryData, plittleEndian, start, offset){
    
    var littleEndian = littleEndian === undefined ? true : littleEndian;
    var dataBuffer;
    var dataView;
    var bytePointer = 0;
    var bufferLength;
    var dataSize = {
      'Int8': 1,
      'Int16': 2,
      'Int32': 4,
      'Uint8': 1,
      'Uint16': 2,
      'Uint32': 4,
      'Float32': 4,
      'Float64': 8
    };
    
    var dataGetter = function(byteOffset, plittleEndian, type){
      var data;
      if(plittleEndian === undefined){
        plittleEndian = littleEndian;
      }
      if(!byteOffset){
        byteOffset = bytePointer;
      }
      data = dataView['get' + type](byteOffset, plittleEndian);
      bytePointer = byteOffset + dataSize[type];
      return data;
    };
    
    if (!window.ArrayBuffer || !window.DataView) {
      throw new Error('The ArrayBuffer and DataView APIs are not supported in your browser.');
    }
    
    function parseBinaryString(binaryString){
      var i = 0;
      var character; 
      var byte;
      bufferLength = binaryString.length;
      dataBuffer = new ArrayBuffer(binaryString.length);
      dataView = new DataView(dataBuffer, 0, bufferLength);
      while (i < binaryString.length) {
        character = binaryString.charCodeAt(i);
        byte = character & 0xff;  
        dataView.setUint8(i, byte);
        i += 1;
      }
    }
    
    if (typeof binaryData === 'string') {
      parseBinaryString(binaryData);
    } else {
      if (binaryData instanceof ArrayBuffer) {
        dataBuffer = binaryData;
        bufferLength = offset || dataBuffer.byteLength;
        dataView = new DataView(dataBuffer, start !== undefined? start: 0, bufferLength);
      }
    }
    
    this.getInt8 = function(byteOffset, littleEndian) { return dataGetter(byteOffset, littleEndian, 'Int8'); };
    this.getInt16 = function(byteOffset, littleEndian) { return dataGetter(byteOffset, littleEndian, 'Int16'); };
    this.getInt32 = function(byteOffset, littleEndian) { return dataGetter(byteOffset, littleEndian, 'Int32'); };
    this.getUint8 = function(byteOffset, littleEndian) { return dataGetter(byteOffset, littleEndian, 'Uint8'); };    
    this.getUint16 = function(byteOffset, littleEndian) { return dataGetter(byteOffset, littleEndian, 'Uint16'); };    
    this.getUint32 = function(byteOffset, littleEndian) { return dataGetter(byteOffset, littleEndian, 'Uint32'); };    
    this.getFloat32 = function(byteOffset, littleEndian) { return dataGetter(byteOffset, littleEndian, 'Float32'); };    
    this.getFloat64 = function(byteOffset, littleEndian) { return dataGetter(byteOffset, littleEndian, 'Float64'); };
    this.length = function() { return dataView.byteLength; };    
  
  };

  return BinaryDataView;

});
// Parses FITS pixel data and converts fits photon count to the desired format
// Author: Diego Marcos
// Email: diego.marcos@gmail.com

// FITS images have arbitrary pixel values. Cameras count individual photons
// Highest pixel value is the brightest and lowest value the faintest

define('fitsPixelMapper',['./binaryDataView'], function (BinaryDataView) {
  
  
  var mapPixel = function(pixelValue, colorMapping, maxColorValue, highestPixelValue, lowestPixelValue, meanPixelValue) {
    var mappedValue;
    var valuesRange = highestPixelValue - lowestPixelValue;
    switch (colorMapping) { 
        case 'linear' :
        mappedValue = maxColorValue * ((pixelValue - lowestPixelValue) / valuesRange );
        break;
      case 'sqrt' :
        mappedValue = maxColorValue * Math.sqrt((pixelValue - lowestPixelValue) / valuesRange );
        break;
      case 'cuberoot' :
        mappedValue = maxColorValue * Math.pow((pixelValue - lowestPixelValue) / valuesRange );
        break;
      case 'log' :
        mappedValue = maxColorValue * (Math.log((pixelValue - lowestPixelValue)) / valuesRange );
        break;
      case 'loglog':
        mappedValue = maxColorValue * (Math.log((Math.log(pixelValue) - lowestPixelValue)) / valuesRange );
        break;
      case 'sqrtlog':
        mappedValue = maxColorValue * (Math.sqrt((Math.log(pixelValue) - lowestPixelValue)) / valuesRange );
        break;
      default:
        break;
    }
    return mappedValue;
  };

  var convertToRGBA = function (pixelValue, colorMapping, highestPixelValue, lowestPixelValue, meanPixelValue){
    var colorValue = mapPixel(pixelValue, colorMapping, 255, highestPixelValue, lowestPixelValue, meanPixelValue);
    return {
      "red" : colorValue,
      "green" : colorValue,
      "blue" : colorValue,
      "alpha" : 255
    };
  };
  
  var convertToRGB = function () {
     
  };
  
  var pixelFormats = { 
    "RGB" : { "components" : 3, "convert" : convertToRGB },
    "RGBA" : { "components" : 4, "convert" : convertToRGBA }
  };

  var readPixel = function (dataView, bitpix) {
    var pixelValue;
    switch (bitpix) {
      case 8:
        pixelValue = dataView.getUint8();
        break;
      case 16:
        pixelValue = dataView.getInt16(0, false);
        break;
      case 32:
        pixelValue = dataView.getInt32(0, false);
        break;
      case 64:
        pixelValue = dataView.getFloat64(0, false);
        break;
      case -32:
        pixelValue = dataView.getFloat32(0, false);
        //if (pixelValue){
        //  pixelValue = (1.0 + ((pixelValue & 0x007fffff) / 0x0800000)) * Math.pow(2, ((pixelValue&0x7f800000)>>23) - 127);
        //}
        //pixelValue = Math.abs(pixelValue);  
        break;
      case -64:
        pixelValue = dataView.getFloat64(0, false);
        break;
      default: 
        //error('Unknown bitpix value');
    }
    return pixelValue; 
  };

  var error = function (message) {
    throw new Error('PIXEL PARSER - ' + message); 
  };
  
  var flipVertical = function (pixels, width, height) {
    var flippedPixels = [];
    var column = 0;
    var row = 0;
    while (row < height) {
      column = 0;
      while (column < width) {
        flippedPixels[(height - row -1)*width + column] = pixels[row*width + column];
        column += 1;  
      }
      row += 1;
    } 
    return flippedPixels;
  };
  
  var transpose = function (pixels, width, height) {
    var transposedPixels = [];
    var column = 0;
    var row = 0;
    while (row < height) {
      column = 0;
      while (column < width) {
        transposedPixels[row*width + column] = pixels[column*height + row];
        column += 1;  
      }
      row += 1;
    } 
    return transposedPixels;
  };
  
  var mapPixels = function (header, data, format, colorMapping) {
    
    var bzero = header.BZERO || 0.0;
    var bscale = header.BSCALE || 1.0;
    var bitpix = header.BITPIX;
    var pixelSize = Math.abs(bitpix) / 8; // In bytes
    var pixelValue;
    var lowestPixelValue;
    var highestPixelValue;
    var meanPixelValue;
    var dataView;
    var remainingDataBytes;
    var imagePixelsNumber = header.NAXIS1 * header.NAXIS2;
    var pixels = [];
    var mappedPixel;
    var i = 0;
    colorMapping = colorMapping || 'linear';
    
    if (!format || !pixelFormats[format]) {
     error('Unknown pixel format');
    }
    
    if (!header) {
      error('No header available in HDU');
    }
    
    if (!data) {
      error('No data available in HDU');
    }
    
    dataView = new BinaryDataView(data, false, 0, imagePixelsNumber * pixelSize);
    remainingDataBytes = dataView.length();
    while(remainingDataBytes){
      pixelValue = readPixel(dataView, bitpix) * bscale + bzero;        
    
      if(lowestPixelValue === undefined){
        lowestPixelValue = pixelValue;
      } else {
        lowestPixelValue = pixelValue < lowestPixelValue? pixelValue : lowestPixelValue;
      }
      
      if(highestPixelValue === undefined){
        highestPixelValue = pixelValue;
      } else {
        highestPixelValue = pixelValue > highestPixelValue? pixelValue : highestPixelValue;
      }
      
      pixels.push(pixelValue);
      
      if(!meanPixelValue){
        meanPixelValue = pixelValue;
      } else {
        meanPixelValue = ((pixels.length - 1) / pixels.length) * meanPixelValue + (1 / pixels.length) * pixelValue; // Iterative mean formula
      }
      remainingDataBytes -= pixelSize;
    }
    
    pixels = flipVertical(pixels, header.NAXIS1, header.NAXIS2); // FITS stores pixels in column major order
  
    while (i < imagePixelsNumber) {
      mappedPixel = pixelFormats.RGBA.convert(pixels[i], colorMapping, highestPixelValue, lowestPixelValue, meanPixelValue);
      mappedPixel.value = pixels[i];
      pixels[i] = mappedPixel;
      i += 1;
    }  
    return pixels;
  };

  return mapPixels;

});
define('./fitsValidator',['require'], function(fitsValidator) {

  var FitsFileParser = function () {
    var blockSize = 2880; // In bytes
    var recordSize = 80;
    var file;
    var data = "";
    var headerRecords = [];
    var headerDataUnits = [];
    var fileBytePointer = 0;
    var slice;

    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
      console.error('The File APIs are not fully supported in this browser.');
      return;
    } else {  // For Mozilla 4.0+ || Chrome and Safari || Opera and standard browsers
      slice = File.prototype.mozSlice || File.prototype.webkitSlice || File.prototype.slice;
    }

    var parseHeaderRecord = function(recordString, error, warning) {
      var record = {};
      var valueComment = /^(\s*\x27.*\x27\s*|[^\x2F]*)\x2F{0,1}(.*)$/.exec(recordString.substring(10));
      var value;
      var comment;
      var keyword = recordString.substring(0, 8); // Keyword in the first 8 bytes. Sec 4.1.2.1
      
      if (recordString.charCodeAt(8) !== 61 || recordString.charCodeAt(9) !== 32) { // Value indicator Sec 4.1.2.2
        comment = recordString.substring(8); // If not value all the rest of the record treated like a comment Sec 4.1.2
        comment = comment.trim().replace(/^\/(.*)$/,"$1"); // Removing comment slash indicator
      } else {
        value = valueComment[1];
        comment = valueComment[2];
      }
      
      record.keyword = fitsValidator.validateKeyword(keyword, error) || undefined;
      record.comment = fitsValidator.validateComment(comment, keyword, warning) || undefined;
      record.value = fitsValidator.validateValue(value, record.keyword, recordString, error);
      return record;
    };

    var parseHeaderBlock = function(blockString, error, warning) {
      var records = [];
      var record = {};
      var bytePointer = 0;
      var recordString;
      while (bytePointer < blockString.length) {
        recordString = blockString.substring(bytePointer, bytePointer + recordSize - 1);
        if (/^END[\x20]*/.test(recordString)) {
          records.end = true;
          return records;
        }
        console.log(recordString);
        bytePointer += recordSize;
        record = parseHeaderRecord(recordString, error, warning);
        if (record) {
          records.push(record);
        }  
      }
      return records;
      };

    function parseHeaderBlocks(success, error) {
      var fileBlock;
      var reader = new FileReader();
      
      var parseError = function (message) {
        error("Error parsing file: " + message);
      };
      
      var parseWarning = function (message) {
        error("Warning: " + message);
      };
           
      reader.onload = function (e) {
        var parsedRecords;
        // Checking allowed characters in Header Data Unit (HDU). 
        // Subset of ASCII characters between 32 and 126 (20 and 7E in hex)
        if (!/^[\x20-\x7E]*$/.test(this.result)) { // Sec 3.2
          error("Ilegal character in header block");
        }
        parsedRecords = parseHeaderBlock(this.result, parseError, parseWarning);
        headerRecords = [].concat(headerRecords, parsedRecords);
        if (parsedRecords.errorMessage) {
          parseError(parsedRecords.errorMessage);
        }
        if (!parsedRecords.end) {
          parseHeaderBlocks(success, error);
        } else {
          success(headerRecords); 
        }
      };

      reader.onerror = function (e) {
        console.error("Error loading block");
      };
      
      if (fileBytePointer === blockSize) { // After reading the first block
        if (headerRecords[0].keyword !== 'SIMPLE') {  
          parseError('First keyword in primary header must be SIMPLE'); // Sec 4.4.1.1
        } else {
          if (!headerRecords[0].value) {  
            parseWarning("This file doesn't conform the standard. SIMPLE keyword value different than T"); // Sec 4.4.1.1
          }
        }
      }  
      fileBlock = slice.call(file, fileBytePointer, fileBytePointer + blockSize);
      fileBytePointer += blockSize;
      reader.readAsText(fileBlock);
    }
      
    var parseDataBlocks = function(dataSize, success, error) {
      var fileBlock;
      var reader = new FileReader();
      var blocksToRead = Math.ceil(dataSize / blockSize);
      var bytesToRead = blocksToRead * blockSize;
      var parseError = function (message) {
        error("Error parsing file: " + message);
      };
     
      reader.onload = function (e) {
        data = this.result; //.substring(0, dataSize); // Triming last bytes in excess in last block
        success(); 
      };

      reader.onerror = function (e) {
        console.error("Error loading data block");
      };

      fileBlock = slice.call(file, fileBytePointer, fileBytePointer + bytesToRead);
      fileBytePointer += bytesToRead;
      reader.readAsArrayBuffer(fileBlock);
    };

    var parseHeaderJSON = function(headerRecords){
      var i = 0;
      var header = {};
      var keyword;
      var record;
      while (i < headerRecords.length) {
        record = headerRecords[i];
        keyword = record.keyword;
        if(keyword && keyword !== "COMMENT" && keyword !== "HISTORY"){
          if (record.value) {
            header[keyword] = record.value;
          }
        }
        i += 1;
      }
      return header;
    };

    var parseHeaderDataUnit = function(success, error) {
      var headerJSON;
      var dataSize;
      var successParsingData = function () {
        success({
          "header": headerJSON,
          "data": data,
          "headerRecords": headerRecords
        });
      };
      
      var succesParsingHeader = function (records) {
        var i = 1;
        headerRecords = records;
        headerJSON = parseHeaderJSON(headerRecords);
        dataSize = Math.abs(headerJSON.BITPIX) / 8;
        while (i <= headerJSON.NAXIS) {
          dataSize = dataSize * headerJSON["NAXIS" + i];
          i += 1;
        }
        parseDataBlocks(dataSize, successParsingData, error);
      };
      
      headerRecords = [];
      data = [];
      parseHeaderBlocks(succesParsingHeader, error);

    };

    this.parse = function (inputFile) {
      fileBytePointer = 0;
      file = inputFile;
      var that = this;
      if (!file) {
        console.error('Failed when loading file. No file selected');
        return;
      }
      
      var onErrorParsingHeaderDataUnit = function(error) {
        that.onError(error);
      };
      
      var onParsedHeaderDataUnit = function(headerDataUnit){
        if (headerDataUnits.length === 0){
          fitsValidator.validatePrimaryHeader(headerDataUnit.header, onErrorParsingHeaderDataUnit);
        } else {
          fitsValidator.validateExtensionHeader(headerDataUnit.header, onErrorParsingHeaderDataUnit);
        }
        headerDataUnits.push(headerDataUnit);
        if (fileBytePointer < file.fileSize){
          parseHeaderDataUnit(onParsedHeaderDataUnit, onErrorParsingHeaderDataUnit);
        } else {
          that.onParsed(headerDataUnits);
        }
      };    
      parseHeaderDataUnit(onParsedHeaderDataUnit, onErrorParsingHeaderDataUnit);
    };

    this.onParsed = function (headerDataUnits) {};
    this.onError = function (error) {
      console.error(error);
    };

  };

  return FitsFileParser;

});
define("fitsFileParser", function(){});

// FITS Standard 3.0 Parser
// Author: Diego Marcos
// Email: diego.marcos@gmail.com

define('fitsParser',['./fitsPixelMapper', './fitsFileParser'], function (fitsPixelMapper, FitsFileParser) {
  
  
  var FitsParser = function() {
    var parser;
    var fileExtensionExpr = /.*\.([^.]+)$/
    var imageType;

    this.parse = function (input) {
      if (input instanceof File){
        imageType = (input.fileName.match(fileExtensionExpr))[1];
        if (imageType === 'fits') {
          parser = new FitsFileParser();
        } else if (imageType === 'png') {
          parser = new PngFileParser();
        } else {
          console.error('FitsParser. Unknown image format')
          return;
        }
        parser.onParsed = this.onParsed;
        parser.onError = this.onError;
        parser.parse(input);
      }
      else if (typeof input === 'string') {
        
      }
    };
    
    this.onParsed = function (headerDataUnits) {
      
    };

    this.onError = function (error) {
      console.error(error);
    };

  };

  return {
    'Parser': FitsParser,
    'mapPixels' : fitsPixelMapper
  };

});