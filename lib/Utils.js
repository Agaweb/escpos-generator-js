export default class Utils {

  static stringToByteArray(str) {
    var output = [], p = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      // NOTE: c <= 0xffff since JavaScript strings are UTF-16.
      if (c > 0xff) {
        output[p++] = c & 0xff;
        c >>= 8;
      }
      output[p++] = c;
    }
    return output;
  }
}