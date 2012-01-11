define(function() {

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
      
      record.keyword = keyword; //validateKeyword(keyword, error) || undefined;
      record.comment = comment; //validateComment(comment, keyword, warning) || undefined;
      record.value = value; //validateValue(value, record.keyword, recordString, error);
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
          validatePrimaryHeader(headerDataUnit.header, onErrorParsingHeaderDataUnit);
        } else {
          validateExtensionHeader(headerDataUnit.header, onErrorParsingHeaderDataUnit);
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