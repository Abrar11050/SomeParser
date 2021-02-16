/*const _A = "A".charCodeAt(0);
const _Z = "Z".charCodeAt(0);
const _a = "a".charCodeAt(0);
const _z = "z".charCodeAt(0);
const _0 = "0".charCodeAt(0);
const _9 = "9".charCodeAt(0);
const _dot = ".".charCodeAt(0);
const _usc = ".".charCodeAt(0);*/

const Chars = {
    isIDFStart : function (cp) {
        return (cp === 0x24) || (cp === 0x5F) ||  // $ (dollar) and _ (underscore)
            (cp >= 0x41 && cp <= 0x5A) ||         // A..Z
            (cp >= 0x61 && cp <= 0x7A);           // a..z
    },

    isIDFPart : function (cp) {
        return (cp === 0x24) || (cp === 0x5F) ||  // $ (dollar) and _ (underscore)
            (cp >= 0x41 && cp <= 0x5A) ||         // A..Z
            (cp >= 0x61 && cp <= 0x7A) ||         // a..z
            (cp >= 0x30 && cp <= 0x39);           // 0..9
    },

    isWSpace : function (cp) {
        return (cp === 0x20) || (cp === 0x09) || (cp === 0x0B) || (cp === 0x0C) || (cp === 0xA0) ||
            (cp >= 0x1680 && [0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF].indexOf(cp) >= 0);
    },
    
    isLineEnd : function (cp) {
        return (cp === 0x0A) || (cp === 0x0D) || (cp === 0x2028) || (cp === 0x2029);
    },

    isNumPart : function (cp) {
        return (cp >= 0x30 && cp <= 0x39) || (cp === 0x2E);
    },

    isNumerical : function (cp) {
        return (cp >= 0x30 && cp <= 0x39);
    },


};

module.exports = Chars;