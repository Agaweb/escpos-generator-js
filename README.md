# ESC/POS Commands Generator
## Javascript ES6 (initially written to be used in react-native)

## Getting started

`$ npm i escpos-generator`

## Usage - Generator (API)
Every method (except toArray and the constructor) returns `this` (default, can be changed by setModality), so it's possible to use the methods both from the generator object and from a method.

### **constructor**
Start a new generation.

### **setModality**(modality)
Sets the return modality of the methods. Default to `MODALITY_CLASS`

**modality (string):** look into modality section under getters

### **init**()
Initialize the printer

### **selectCharacterCodeTable**(esc_pos_number, page_table)
Sets the character code table 

**esc_pos_number (int):** look at (https://reference.epson-biz.com/modules/ref_escpos/index.php?content_id=32)<br>
**page_table (int):** look at (https://en.wikipedia.org/wiki/Code_page)<br>

<br><br>
... **Work in progress**
<br><br>

### **getters**
**Modality:**<br>
MODALITY_CLASS (return `this`)<br>
MODALITY_ARRAY (return the array of commands as an array of arrays of bytes)<br>
MODALITY_DIRECT (return directly the command generated as  an array of bytes)<br>
**Positions:**<br>
LEFT<br>
CENTER<br>
RIGHT<br>
**Cut paper:**<br>
CUT_PAPER_PARTIAL<br>
CUT_PAPER_FULL<br>
**Font size:**<br>
FONT_NORMAL<br>
FONT_DOUBLE<br>
FONT_TRIPLE

### Example
```javascript
import EscposGenerator from "escpos-generator";

let generator = new EscposGenerator();

generator.init()
    .selectCharacterCodeTable(19, 858)
    .font(EscposGenerator.FONT_NORMAL)
    .align(EscposGenerator.CENTER)
    .bold()
    .text("Mario bros")
    .bold(false)
    .newLine()
    .text("It's-a me, Mario!")
    .newLine()
    .cutPaper(EscposGenerator.CUT_PAPER_FULL, 0x80);

let array = generator.toArray(true);
```