// FITS Standard 3.0 Parser
// Author: Diego Marcos
// Email: diego.marcos@gmail.com

define(['./fitsPixelMapper', './fitsFileParser'], function (fitsPixelMapper, FitsFileParser) {
  "use strict";
  
  var FitsParser = function() {
    var parser;
    //var fileExtensionExpr = /.*\.([^.]+)$/
    var imageType;

    var checkFileKeyWord = function(file, success) {
      var keyWord;
      var reader = new FileReader();
      var slice;

      reader.onload = function (e) {
        success(this.result, file);
      };

      reader.onerror = function (e) {
        console.error("Error loading block");
      };

      if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
        console.error('The File APIs are not fully supported in this browser.');
        return;
      } else {  // For Mozilla 4.0+ || Chrome and Safari || Opera and standard browsers
        slice = File.prototype.mozSlice || File.prototype.webkitSlice || File.prototype.slice;
      }
      reader.readAsText(slice.call(input, 0, 8));

    };

    var parseFile = function (keyWord, file){
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
    };

    this.parse = function (input) {
      if (input instanceof File) {
        checkFileKeyWord(input, parseFile);
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