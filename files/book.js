// This is where you can put your own javascript for use in your book.


function ordinal(n) {
    var s = ["th", "st", "nd", "rd"];
    var v = n % 100;
    return n + "<sup>" + (s[(v-20)%10] || s[v] || s[0]) + "</sup>";
}