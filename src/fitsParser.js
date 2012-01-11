// FITS Standard 3.0 Parser
// Author: Diego Marcos
// Email: diego.marcos@gmail.com

define(['./fitsPixelMapper', './fitsFileParser'], function (fitsPixelMapper, FitsFileParser) {
  "use strict";
  
  var FitsParser = function() {
    var parser;
    //var fileExtensionExpr = /.*\.([^.]+)$/
    var imageType;
    var that = this;

    var checkFileSignature = function(file, success) {
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
      reader.readAsText(slice.call(file, 0, 8));

    };

    var parseFile = function (fileSignature, file){
      
      if (fileSignature === 'SIMPLE  ') {
        parser = new FitsFileParser();
      } else if (fileSignature === String.fromCharCode(137, 80, 78, 71, 13, 10, 26, 10)) {
        parser = new PngFileParser();
      } else {
        console.error('FitsParser. Unknown image format')
        return;
      }
      parser.onParsed = that.onParsed;
      parser.onError = that.onError;
      parser.parse(file);

    };

    this.parse = function (input) {
      if (input instanceof File) {
        checkFileSignature(input, parseFile);
      }
      else if (typeof input === 'string') {
      }
    };
    
    this.onParsed = function (headerDataUnits) {};

    this.onError = function (error) {
      console.error(error);
    };

  };

  return {
    'Parser': FitsParser,
    'mapPixels' : fitsPixelMapper
  };

});