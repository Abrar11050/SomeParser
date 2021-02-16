const Chars = require('./Character');
const Tokens = require('./Tokens');

const keywords = ['break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'default',
    'delete',
    'do',
    'else',
    'extends',
    'finally',
    'for',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'new',
    'return',
    'super',
    'switch',
    'this',
    'throw',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'private',
    'protected',
    'public',
    'static'];

class Lexer {
    constructor(source)  {
        this.source = source;
        this.index = 0;
    }

    eof() {
        return this.index >= this.source.length;
    }

    Peek(sign) {
        for (let z = 0; z < sign.length; z++) if (this.source.charAt(this.index + z) !== sign.charAt(z)) return false;
        return true;
    }

    escapeSingleComment() {
        this.index += 2;
        while(!this.eof()) {
            const cp = this.source.charCodeAt(this.index);
            this.index++;
            if(Chars.isLineEnd(cp)) {
                if(cp === 13 && this.source.charCodeAt(this.index) === 10) {
                    this.index++;
                    break;
                }
            }
        }
    }

    escapeMultiLine() {
        this.index += 2;
        while(!this.eof()) {
            const cp = this.source.charCodeAt(this.index);
            if(cp === 0x2A) {
                if(this.Peek("*/")) {
                    this.index += 2;
                    break;
                }
            }
            this.index++;
        }
    }

    scanIDF() {
        const start = this.index;
        this.index++;

        while(!this.eof()) {
            const cp = this.source.charCodeAt(this.index);
            if(!Chars.isIDFPart(cp))
                break;

            this.index++;
        }

        return {
            type : Tokens.Identifier,
            value : this.source.slice(start, this.index)
        };
    }


    scanNumerals() {
        let str = "";
        while(!this.eof()) {
            const ch = this.source.charAt(this.index);
            const cp = this.source.charCodeAt(this.index);

            if(!Chars.isNumPart(cp))
                break;

            str += ch;
            this.index++;
        }

        return {
          type : Tokens.Number,
          value : str === "" ? 0 : parseFloat(str)
        };
    }

    scanString() {
        let quote = this.source.charAt(this.index);
        this.index++;
        let str = "";

        while(!this.eof()) {
            let ch = this.source.charAt(this.index++);
            if(ch === quote) {
                quote = "";
                break;
            } else if(ch === '\\') {
                ch = this.source.charAt(this.index++);
                if(!Chars.isLineEnd(ch.charCodeAt(0))) {
                    switch (ch) {
                        case 'n':
                            str += '\n';
                            break;
                        case 'r':
                            str += '\r';
                            break;
                        case 't':
                            str += '\t';
                            break;
                        case 'b':
                            str += '\b';
                            break;
                        case 'f':
                            str += '\f';
                            break;
                        case 'v':
                            str += '\v';
                            break;

                    }
                } else {
                    if(ch === '\r' && this.source.charAt(this.index) === '\n')
                        this.index++;
                }
            } else if(Chars.isLineEnd(ch.charCodeAt(0))) {
                break;
            } else {
                str += ch;
            }
        }

        if(quote !== '') throw "Unexpected Token";

        return {
            type : Tokens.String,
            value : str
        };
    }

    scanPunctuation() {
        const cp = this.source.charCodeAt(this.index);
        const ch = this.source.charAt(this.index);
        if('(){}[].,;:?~'.indexOf(ch) >= 0) {
            this.index++;
            return {
                type : Tokens.Punctuation,
                value : ch
            };
        }
        if(this.Peek('>>>=')) { this.index += 4; return { type : Tokens.Punctuation, value : '>>>=' }; }
        if(this.Peek('>>>')) { this.index += 3; return { type : Tokens.Punctuation, value : '>>>' }; }
        if(this.Peek('<<=')) { this.index += 3; return { type : Tokens.Punctuation, value : '<<=' }; }
        if(this.Peek('>>=')) { this.index += 3; return { type : Tokens.Punctuation, value : '>>=' }; }

        const twos = ['&&', '||', '==', '!=',
                      '+=', '-=', '*=', '/=',
                      '++', '--', '<<', '>>',
                      '&=', '|=', '^=', '%=',
                      '<=', '>='];
        for(let i in twos) {
            if(this.Peek(twos[i])) {
                this.index += 2;
                return { type : Tokens.Punctuation, value : twos[i] };
            }
        }

        if('<>=!+-*%&|^/'.indexOf(ch) >= 0) {
            this.index++;
            return { type : Tokens.Punctuation, value : ch };
        }

        throw "Unknown Character";

    }

    nextToken() {
        while(!this.eof()) {
            const cp = this.source.charCodeAt(this.index);
            if(Chars.isWSpace(cp) || Chars.isLineEnd(cp)) { this.index++; }
            else if(this.Peek("//")) { this.escapeSingleComment(); }
            else if(this.Peek("/*")) { this.escapeMultiLine(); }
            else { break; }
        }
        const temp = this.lex();
        if(temp.type === Tokens.Identifier) {
            const val = temp.value;
            if(val === 'true' || val === 'false') {
                temp.type = Tokens.Boolean;
            } else if(val === 'null') {
                temp.type = Tokens.Null;
            } else if(keywords.indexOf(val) >= 0) {
                temp.type = Tokens.Keyword;
            }
        }
        return temp;
    }

    lex() {
        if(this.eof()) {
            return {
                type : Tokens.EOF,
                value : null
            };
        }

        const cp = this.source.charCodeAt(this.index);
        const ch = this.source.charAt(this.index);

        if(Chars.isIDFStart(cp)) {
            return this.scanIDF();
        }

        if(ch === "'" || ch === '"') {
            return this.scanString();
        }

        if(ch === ".") {
            if(this.Peek('...')) {
                this.index += 3; return { type : Tokens.Punctuation, value : '...' };
            }
            if(Chars.isNumerical(this.source.charAt(this.index+1))) {
                return this.scanNumerals()
            }
            return this.scanPunctuation();
        }

        if(Chars.isNumerical(cp)) {
            return this.scanNumerals();
        }

        return this.scanPunctuation();
    }
}

module.exports = Lexer;
/*
function TokenKey(n) {
    for(let key in Tokens)
        if(Tokens[key] === n)
            return key;
}


const fs = require('fs');
const source = fs.readFileSync('lazy.js', 'utf8');

const lex = new Lexer(source);

while(true) {
    const tok = lex.nextToken();
    if(tok.type === Tokens.EOF)
        break;
    tok.type = TokenKey(tok.type);
    console.log(tok);
}
 */