import ASCII from "./ascii";
import iconv from "iconv-lite";

export default class Generator {
  constructor(max_characters_per_line = 48) {
    this.modality = Generator.MODALITY_CLASS;
    this._max_characters_per_line = max_characters_per_line;
    this.font_size = Generator.FONT_NORMAL;
    this.commands = [];
    this._page_table = "858";
  }

  setModality(modality) {
    if (modality === Generator.MODALITY_CLASS) {
      this.modality = Generator.MODALITY_CLASS;
    } else if (modality === Generator.MODALITY_ARRAY) {
      this.modality = Generator.MODALITY_ARRAY;
    } else if (modality === Generator.MODALITY_DIRECT) {
      this.modality = Generator.MODALITY_DIRECT;
    }

    return this;
  }

  init() {
    let command = [ASCII.ESC, 0x40];

    return this._rightModality(command);
  }

  selectCharacterCodeTable(esc_pos_number, page_table) {
    let command = [ASCII.ESC, 0x74, esc_pos_number];
    this._page_table = page_table;

    return this._rightModality(command);
  }

  newLine() {
    let command = [ASCII.LF];

    return this._rightModality(command);
  }

  hr() {
    let commands = [];
    for (let i = this._currentMaxCharactersPerLine(); i > 0; i--) {
      commands.concat(this.text("-"));
    }

    return this._rightModality(commands);
  }

  text(text) {
    if (text) {
      let bytes;
      if (Array.isArray(text)) {
        bytes = text;
      } else {
        bytes = this._textToBytes(text);
      }
      return this._rightModality(bytes);
    } else {
      return this._rightModality([]);
    }
  }

  textColumns(values) {
    let done = !values.length;
    let command = [];

    if (!done) {
      let currentAvailableChar = this._currentMaxCharactersPerLine();

      //Prepare everything
      let toBeAutomaticallyAllocated = [];
      values.forEach((item) => {
        if (!item.percentage) {
          item.__allocated_chars = -1;
          toBeAutomaticallyAllocated.push(item);
        } else {
          let toAlloc = parseInt(
            (this._currentMaxCharactersPerLine() / 100) * item.percentage
          );
          currentAvailableChar -= toAlloc;
          item.__allocated_chars = toAlloc;
        }

        let splitted = item.text.split(" ");
        item.__text_array = [];
        for (let i = 0; i < splitted.length; i++) {
          item.__text_array.push(splitted[i]);

          if (i !== splitted.length - 1) {
            item.__text_array.push(" ");
          }
        }

        if (!item.alignment) {
          item.alignment = Generator.LEFT;
        }
      });

      //Manage the automatic chars alloc
      if (toBeAutomaticallyAllocated.length) {
        let spacePerItem = parseInt(
          currentAvailableChar / toBeAutomaticallyAllocated.length
        );
        toBeAutomaticallyAllocated.forEach((item) => {
          item.__allocated_chars = spacePerItem;
          currentAvailableChar -= spacePerItem;
        });
      }

      //Check if there are some words that are larger than the max chars
      values.forEach((item) => {
        let processed = [];
        item.__text_array.forEach((singleText) => {
          function recursiveCut(text, max_chars, processed) {
            if (text.length > max_chars) {
              let subStr = text.substring(0, max_chars);
              processed.push(subStr);

              recursiveCut(
                text.substring(max_chars, text.length),
                max_chars,
                processed
              );
            } else {
              processed.push(text);
            }
          }

          recursiveCut(singleText, item.__allocated_chars, processed);
        });

        item.__text_array = processed;
      });

      while (!done) {
        let allocated = [];

        let done_counter = 0;
        values.forEach((item) => {
          let prefix = [];
          if (item.prefix) {
            prefix = item.prefix;
          }
          allocated = allocated.concat(prefix);

          let remainingCharsToBeAllocated = item.__allocated_chars;

          //Loop until I reach the max length
          let bytesToWrite = [];
          for (let i = 0; i < item.__text_array.length; i++) {
            //Check if it's possible to insert the item
            if (item.__text_array[i].length <= remainingCharsToBeAllocated) {
              bytesToWrite = bytesToWrite.concat(
                this._textToBytes(item.__text_array[i])
              );
              remainingCharsToBeAllocated -= item.__text_array[i].length;

              item.__text_array.splice(i, 1);
              i--;
            }
          }

          let bytesSpaces = [];
          for (let i = 0; i < remainingCharsToBeAllocated; i++) {
            bytesSpaces.push(0x20);
          }

          switch (item.alignment) {
            case Generator.LEFT:
              bytesToWrite = bytesToWrite.concat(bytesSpaces);
              break;
            case Generator.RIGHT:
              bytesToWrite = bytesSpaces.concat(bytesToWrite);
              break;
            case Generator.CENTER:
              bytesToWrite = bytesToWrite.concat(bytesSpaces);
              break;
          }

          allocated = allocated.concat(bytesToWrite);

          let postfix = [];
          if (item.postfix) {
            postfix = item.postfix;
          }

          allocated = allocated.concat(postfix);

          if (!item.__text_array.length) {
            done_counter++;
          }
        });

        //Check if there's still some text to be written
        if (done_counter === values.length) {
          done = true;
        }

        command = command.concat(allocated);
      }
    }

    return this._rightModality(command);
  }

  align(where) {
    let byte = null;
    if (where === Generator.LEFT) {
      byte = 0x00;
    } else if (where === Generator.RIGHT) {
      byte = 0x02;
    } else if (where === Generator.CENTER) {
      byte = 0x01;
    }

    if (byte !== null) {
      let bytes = [ASCII.ESC, 0x61, byte];
      return this._rightModality(bytes);
    } else {
      return this._rightModality([]);
    }
  }

  cutPaper(modality = Generator.CUT_PAPER_FULL, feed = 0x00) {
    let byte = null;
    if (modality === Generator.CUT_PAPER_FULL) {
      byte = 0x41;
    } else if (modality === Generator.CUT_PAPER_PARTIAL) {
      byte = 0x42;
    }

    if (byte !== null) {
      let bytes = [ASCII.GS, 0x56, byte, feed];
      return this._rightModality(bytes);
    } else {
      return this._rightModality([]);
    }
  }

  bold(on = true) {
    let byte = 0x00;
    if (on) {
      byte = 0x01;
    }

    let bytes = [ASCII.ESC, 0x45, byte];
    return this._rightModality(bytes);
  }

  //https://gist.github.com/elenzil/4a0ac387d4b02cc7752cd237857aecf1
  font(n = Generator.FONT_NORMAL) {
    let bytes = [ASCII.GS, 0x21, n];
    this.font_size = n;
    return this._rightModality(bytes);
  }

  raw(array) {
    return this._rightModality(array);
  }

  toArray(united = false) {
    if (united) {
      return [].concat.apply([], this.commands);
    } else {
      return this.commands;
    }
  }

  _rightModality(command) {
    if (this.modality === Generator.MODALITY_CLASS) {
      if (command.length) this.commands.push(command);
      return this;
    } else if (this.modality === Generator.MODALITY_ARRAY) {
      if (command.length) this.commands.push(command);
      return command;
    } else if (this.modality === Generator.MODALITY_DIRECT) {
      return command;
    }
  }

  _textToBytes(text) {
    if (!text) return [];
    return Array.from(iconv.encode(text, this._page_table));
  }

  _currentMaxCharactersPerLine() {
    return this._max_characters_per_line / ((this.font_size % 16) + 1);
  }

  //Static variables
  static get MODALITY_CLASS() {
    return "class";
  }
  static get MODALITY_ARRAY() {
    return "array";
  }
  static get MODALITY_DIRECT() {
    return "direct";
  }

  static get LEFT() {
    return "left";
  }
  static get CENTER() {
    return "center";
  }
  static get RIGHT() {
    return "right";
  }

  static get CUT_PAPER_PARTIAL() {
    return "partial";
  }
  static get CUT_PAPER_FULL() {
    return "full";
  }

  static get FONT_NORMAL() {
    return 0x00;
  }
  static get FONT_DOUBLE() {
    return 0x11;
  }
  static get FONT_TRIPLE() {
    return 0x22;
  }
}
