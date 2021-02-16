const Chars = require('./Character');
const Tokens = require('./Tokens');
const Lexer = require('./Lexer');

class Parser {
    constructor(source) {
        this.lexer = new Lexer(source);
        this.current = this.lexer.nextToken();
        if(this.current.type === Tokens.EOF) {
            throw "Source is empty";
        }
    }
    nextToken() {
        this.current = this.lexer.nextToken();
        return this.current;
    }
    consume(val) {
        if(this.current.value === val) {
            this.nextToken();
            return;
        }
        throw `${val} Expected!`;
    }

    Script() {
        let statements = [];
        while(this.current.type !== Tokens.EOF) {
            if(this.current.type === Tokens.EOF)
                break;
            statements.push(this.StatementItem());
        }
        return statements;
    }

    Block() {
        this.consume('{');
        const statements = [];
        while (this.current.type !== Tokens.EOF) {
            if(this.current.value === '}')
                break;
            statements.push(this.StatementItem());
        }
        this.consume('}');
        return { kind: 'BlockStatementList', list: statements };
    }

    StatementItem() {
        if(this.current.value === 'var' || this.current.value === 'const') {
            let decls = this.VarDecl();
            this.consume(';');
            return decls;
        } else {
            return this.Statement();
        }
    }

    VarDecl() {
        const verify = this.current.value === 'var' || this.current.value === 'const';
        if(!verify) {
            throw "Variable declaration must start with var or const";
        }
        let decls = [];
        const type = this.current.value;
        this.nextToken();
        let idef = this.Ident();
        if(this.current.value === '=') {
            this.consume('=');
            let xpr = this.Expr(); if(xpr === null) throw "Init Expr expected";
            decls.push({ kind: 'VarDecl', name: idef.value, type: type, init: xpr });
        } else {
            decls.push({ kind: 'VarDecl', name: idef.value, type: type, init: null });
        }
        while(this.current.value === ',') {
            this.consume(',');
            let _idef = this.Ident();
            if(this.current.value === '=') {
                this.consume('=');
                let _xpr = this.Expr(); if(_xpr === null) throw "Init Expr expected";
                decls.push({ kind: 'VarDecl', name: _idef.value, type: type, init: _xpr });
            } else {
                decls.push({ kind: 'VarDecl', name: _idef.value, type: type, init: null });
            }
        }
        if(decls.length === 1) {
            return decls[0];
        } else {
            return { kind: 'VarDeclList', list: decls };
        }
    }

    Statement() {
        // FormPar <null>
        switch(this.current.value) {
            case '{': {
                return this.Block();
            }

            case '(':
            case '[':
            case 'this':
            case 'super':
            case '!':
            case '~':
            case '+':
            case '-':
            case '++':
            case '--':
            {
                const expr = this.Expr();
                this.consume(';');
                return { kind: 'ExprStatement', expr: expr };
            }

            case ';': {
                this.consume(';');
                { return { kind: 'EmptyStatement' }; }
            }
            case 'if': {
                this.consume('if');
                this.consume('(');
                const test = this.Expr();
                this.consume(')');
                const yes = this.Statement();
                if(this.current.value === 'else') {
                    this.nextToken();
                    return {kind: 'IfStatement', test: test, yes: yes, no: this.Statement() };
                } else {
                    return {kind: 'IfStatement', test: test, yes: yes, no: null };
                }
            }
            case 'while': {
                this.consume('while');
                this.consume('(');
                const condition = this.Expr();
                this.consume(')');
                return {kind: 'WhileStatement', condition: condition, body: this.Statement() };
            }
            case 'for': {
                this.consume('for');
                this.consume('(');
                const init = this.ForInit();
                this.consume(';');
                const condition = this.Expr();
                this.consume(';');
                const update = this.ForUpdate();
                this.consume(')');
                return { kind: 'ForStatement', init: init, condition: condition, update: update, body: this.Statement() };
            }
            case 'do': {
                this.consume('do');
                const states = this.Statement();
                this.consume('while');
                this.consume('(');
                const condition = this.Expr();
                this.consume(')');
                this.consume(';');
                return { kind: 'DoWhileStatement', body: states, condition: condition };
            }
            case 'switch': {
                this.consume('switch');
                this.consume('(');
                const target = this.Expr();
                this.consume(')');
                let hasDefault = false;
                let cases = [];
                this.consume('{');
                while(this.current.type !== Tokens.EOF) {
                    if(this.current.value === '}') break;
                    const caseClause = this.CaseClause();
                    if(caseClause.test === null) {
                        if(hasDefault)
                            throw "Multiple defaults not allowed";
                        hasDefault = true;
                    }
                    cases.push(caseClause);
                }
                this.consume('}');
                return { kind: 'SwitchStatement', target: target, cases: cases };
            }
            case 'break': {
                this.consume('break');
                let target = null;
                if(this.current.type === Tokens.Identifier) {
                    target = this.Ident();
                }
                this.consume(';');
                return { kind: 'BreakStatement', target: target };
            }
            case 'continue': {
                this.consume('continue');
                let target = null;
                if(this.current.type === Tokens.Identifier) {
                    target = this.Ident();
                }
                this.consume(';');
                return { kind: 'ContinueStatement', target: target };
            }
            case 'return': {
                this.consume('return');
                const returns = this.Expr();
                this.consume(';');
                return { kind: 'ReturnStatement', returns: returns };
            }
            case 'throw': {
                this.consume('throw');
                const item = this.Expr();
                if(item === null)
                    throw "Throw cannot be empty";
                this.consume(';');
                return { kind: 'ThrowStatement', item: item };
            }
            case 'try': {
                this.consume('try');
                const body = this.Block();
                this.consume('catch');
                this.consume('(');
                const handler = this.FormPar();
                this.consume(')');
                const handlerBody = this.Block();
                if(this.current.value === 'finally') {
                    this.nextToken();
                    return { kind: 'TryCatchStatement', body: body, handler: handler, handlerBody: handlerBody, finalizer: this.Block() };
                } else {
                    return { kind: 'TryCatchStatement', body: body, handler: handler, handlerBody: handlerBody, finalizer: null };
                }
            }
            default: {
                if(this.current.type === Tokens.Identifier) {
                    const expr = this.Expr();
                    if(expr === null) { return { kind: 'EmptyStatement' }; }
                    if(expr.kind === 'Identifier' && this.current.value === ':') {
                        this.consume(':');
                        return { kind: 'LabelStatement', name: expr.value, statement: this.Statement() };
                    }
                    this.consume(';');
                    return { kind: 'ExprStatement', expr: expr };
                }
                if(this.current.type === Tokens.String
                || this.current.type === Tokens.Null
                || this.current.type === Tokens.Boolean
                || this.current.type === Tokens.Number) {
                    const expr = this.Expr();
                    this.consume(';');
                    return { kind: 'ExprStatement', expr: expr };
                }
                throw `Unexpected token ${this.current.value}`;
            }
        }
    }
    CaseClause() {
        let test = null;
        if(this.current.value === 'case') {
            this.nextToken();
            test = this.Expr();
            if(test === null) throw "Case cannot be empty";
            this.consume(':');
        } else if(this.current.value === 'default') {
            this.nextToken();
            this.consume(':');
        } else {
            throw `Invalid token ${this.current.value} in switch`;
        }
        let statements = [];
        while(this.current.type !== Tokens.EOF) {
            if(this.current.value === 'case' || this.current.value === 'default' || this.current.value === '}') {
                break;
            }
            statements.push(this.StatementItem());
        }
        return { kind: 'CaseClause', test: test, statements: statements };
    }

    ForInit() {
        if(this.current.value === 'const') {
            return this.VarDecl();
        } else if(this.current.value === 'var') {
            return this.VarDecl();
        } else if(this.current.value === ';') {
            return null;
        } else {
            const xplist = this.ExprList(';',false);
            return xplist.length === 1 ? xplist[0] : { kind: 'ExprList', list: xplist };
        }
    }
    ForUpdate() {
        if(this.current.value === ')') {
            return null;
        } else {
            const xplist = this.ExprList(')',false);
            return xplist.length === 1 ? xplist[0] : { kind: 'ExprList', list: xplist };
        }
    }

    ExprList(wall, consume) {
        let elements = [];
        while(this.current.type !== Tokens.EOF && this.current.value !== wall) {
            if(this.current.value === ',') {
                this.nextToken();
                elements.push(null);
            } else {
                let el = this.Expr();
                if(this.current.value !== wall)
                    this.consume(',');
                elements.push(el);
            }
        }
        if(consume) this.consume(wall);
        return elements;
    }
    Expr() {
        const tern = this.Ternary();
        if(tern === null)
            return null;
        let assignable = false;
        let assignop = null;
        if(tern.kind === 'Identifier' || tern.kind === 'MemberAccess' || tern.kind === 'ArrayAccess')
            assignable = true;

        if(["=", "*=", "/=", "%=", "+=", "-=", "<<=", ">>=", ">>>=", "&=", "^=", "|="].indexOf(this.current.value) >= 0) {
            if(!assignable)
                throw "Illegal left hand side expression";
            assignop = this.current.value;
            this.nextToken();
            return {kind: 'Assignment', assignop: assignop, lhs: tern, rhs: this.Expr() };
        } else {
            return tern;
        }
    }
    Ternary() {
        let test = this.CondOr();
        if(this.current.value === '?') {
            this.consume('?');
            let yes = this.Expr();
            this.consume(':');
            let no = this.Ternary();
            return {kind: 'Ternary', test: test, yes: yes, no: no };
        } else {
            return test;
        }
    }
    CondOr() {
        let _temp = this.CondAnd();
        if(this.current.value === '||') {
            let op = this.current.value;
            this.nextToken();
            return {kind: 'Binary', left: _temp, opr: op, right: this.CondOr() };
        } else {
            return _temp;
        }
    }
    CondAnd() {
        let _temp = this.BitOr();
        if(this.current.value === '&&') {
            let op = this.current.value;
            this.nextToken();
            return {kind: 'Binary', left: _temp, opr: op, right: this.CondAnd() };
        } else {
            return _temp;
        }
    }
    BitOr() {
        let _temp = this.BitXor();
        if(this.current.value === '|') {
            let op = this.current.value;
            this.nextToken();
            return {kind: 'Binary', left: _temp, opr: op, right: this.BitOr() };
        } else {
            return _temp;
        }
    }
    BitXor() {
        let _temp = this.BitAnd();
        if(this.current.value === '^') {
            let op = this.current.value;
            this.nextToken();
            return {kind: 'Binary', left: _temp, opr: op, right: this.BitXor() };
        } else {
            return _temp;
        }
    }
    BitAnd() {
        let _temp = this.Equal();
        if(this.current.value === '&') {
            let op = this.current.value;
            this.nextToken();
            return {kind: 'Binary', left: _temp, opr: op, right: this.BitAnd() };
        } else {
            return _temp;
        }
    }
    Equal() {
        let _temp = this.Rel();
        if(this.current.value === '==' || this.current.value === '!=') {
            let op = this.current.value;
            this.nextToken();
            return {kind: 'Binary', left: _temp, opr: op, right: this.Equal() };
        } else {
            return _temp;
        }
    }
    Rel() {
        let _temp = this.Shift();
        if(this.current.value === '<' || this.current.value === '>' || this.current.value === '<=' || this.current.value === '>=' || this.current.value === 'instanceof') {
            let op = this.current.value;
            this.nextToken();
            return {kind: 'Binary', left: _temp, opr: op, right: this.Rel() };
        } else {
            return _temp;
        }
    }
    Shift() {
        let _temp = this.Add();
        if(this.current.value === '<<' || this.current.value === '>>' || this.current.value === '>>>') {
            let op = this.current.value;
            this.nextToken();
            return {kind: 'Binary', left: _temp, opr: op, right: this.Shift() };
        } else {
            return _temp;
        }
    }
    Add() {
        let _temp = this.Mult();
        if(this.current.value === '+' || this.current.value === '-') {
            let op = this.current.value;
            this.nextToken();
            return {kind: 'Binary', left: _temp, opr: op, right: this.Add() };
        } else {
            return _temp;
        }
    }
    Mult() {
        let _temp = this.Unary();
        if(this.current.value === '*' || this.current.value === '/' || this.current.value === '%') {
            let op = this.current.value;
            this.nextToken();
            return {kind: 'Binary', left: _temp, opr: op, right: this.Mult() };
        } else {
            return _temp;
        }
    }
    Unary() {
        switch (this.current.value) {
            case '+':
                this.nextToken();
                return {kind: 'UnaryPlus', post: this.Unary() };
            case '-':
                this.nextToken();
                return {kind: 'UnaryMinus', post: this.Unary() };
            case '++':
                this.nextToken();
                return {kind: 'PreInc', post: this.Unary() };
            case '--':
                this.nextToken();
                return {kind: 'PreDec', post: this.Unary() };
            case '!':
                this.nextToken();
                return {kind: 'LogicalNot', post: this.Unary() };
            case '~':
                this.nextToken();
                return {kind: 'BitwiseNot', post: this.Unary() };
            default:
                return this.Postfix();
        }
    }
    Postfix() {
        const primary = this.Primary();
        if(this.current.value === '++') {
            this.consume('++');
            return {kind: 'PostInc', primary: primary};
        } else if(this.current.value === '--') {
            this.consume('--');
            return {kind: 'PostDec', primary: primary};
        } else {
            return primary;
        }
    }

    Primary() {
        let head = null;
        if(this.current.type === Tokens.Number) {
            head = {kind: 'Number', value: this.current.value};
            this.nextToken();
            return head;
        }
        if(this.current.type === Tokens.Boolean) {
            head = {kind: 'Boolean', value: this.current.value};
            this.nextToken();
            return head;
        }
        if(this.current.type === Tokens.Null) {
            head = {kind: 'Null', value: this.current.value};
            this.nextToken();
            return head;
        }

        if(this.current.type === Tokens.String) {
            head = {kind: 'String', value: this.current.value};
            this.nextToken();
        } else if(this.current.value === 'this' || this.current.value === 'super') {
            head = {kind: 'Fixed', value: this.current.value};
            this.nextToken();
        } else if(this.current.type === Tokens.Identifier) {
            head = {kind: 'Identifier', value: this.current.value};
            this.nextToken();
        } else if(this.current.value === '(') {
            this.consume('(');
            head = this.Expr();
            this.consume(')');
        } else if(this.current.value === '[') {
            head = this.ArrayLiteral();
        } else {
            return null;
        }

        while(this.current.value === '.' || this.current.value === '[' || this.current.value === '(') {
            if(this.current.value === '.') {
                this.consume('.');
                head = {kind: 'MemberAccess', owner: head, member: this.Ident() };
            } else if(this.current.value === '[') {
                this.consume('[');
                head = {kind: 'ArrayAccess', owner: head, member: this.Expr() };
                this.consume(']');
            } else if(this.current.value === '(') {
                head = {kind: 'FunctionCall', fname: head, params: this.ActPars() };
            }
        }
        return head;
    }
    ActPars() {
        let array = [];
        this.consume('(');
        if(this.current.value !== ')') {
            while(this.current.type !== Tokens.EOF) {
                let expr = this.Expr();
                array.push(expr);
                if(this.current.value === ')') break;
                this.consume(',');
                if(this.current.value === ')') break;
            }
        }
        this.consume(')');
        return array;
    }
    ArrayLiteral() {
        let elements = [];
        this.consume('[');
        while(this.current.type !== Tokens.EOF && this.current.value !== ']') {
            if(this.current.value === ',') {
                this.nextToken();
                elements.push(null);
            } else {
                let el = this.Expr();
                if(this.current.value !== ']')
                    this.consume(',');
                elements.push(el);
            }
        }
        this.consume(']');
        return { kind: 'ArrayLiteral', elements: elements };
    }

    Name() {
        if(this.current.type === Tokens.Identifier) {
            var ret = {
                name : this.current.value,
                next : null
            };
            this.nextToken();
            if(this.current.value === '.') {
                this.nextToken();
                ret.next = Name();
            }
            return ret;
        } else {
            throw "IDF expected";
        }
    }
    Literal() {
        if(this.current.type === Tokens.String
            || this.current.type === Tokens.Number
            || this.current.type === Tokens.Boolean
            || this.current.type === Tokens.Null) {
            const ret = {
                type : this.current.type,
                val : this.current.value
            };
            this.nextToken();
            return ret;
        }
        throw "Number/String/Boolean/Null expected";
    }
    Ident() {
        let ret = null;
        if(this.current.type === Tokens.Identifier) {
            ret = this.current.value;
            this.nextToken();
            return {kind: 'Identifier', value: ret};
        }
        throw "Ident expected";
    }
}

module.exports = Parser;