// FITS Standard 3.0 Parser
// Author: Diego Marcos
// Email: diego.marcos@gmail.com

define(['./fitsPixelMapper', './fitsFileParser'], function (fitsPixelMapper, FitsFileParser) {
  "use strict";
  
  var FitsParser = function() {
    var parser;
    var fileExtensionExpr = /.*\.([^.]+)$/
    var imageType;
    var keyWord;

    this.parse = function (input) {
      var slice;
      if (input instanceof File) {
        if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
          console.error('The File APIs are not fully supported in this browser.');
          return;
        } else {  // For Mozilla 4.0+ || Chrome and Safari || Opera and standard browsers
          slice = File.prototype.mozSlice || File.prototype.webkitSlice || File.prototype.slice;
        }
        keyWord = slice.call(input, 0, 8);
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