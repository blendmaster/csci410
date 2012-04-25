(function(){
  var fs, symbol, keywords, digit, string_literal, identifier_start, identifier, comment_start, multiline_comment_start, comment_end, escape, Token, lex, Element, parser, die, infile, file, _ref, _i, _len;
  fs = require('fs');
  symbol = /[\{\}\(\)\[\]\.,;\+\-\*\/&\|<>=~]/;
  keywords = /^(?:class|constructor|function|method|field|static|var|int|char|boolean|void|true|false|null|this|let|do|if|else|while|return)$/;
  digit = /\d/;
  string_literal = '"';
  identifier_start = /[A-Za-z_]/;
  identifier = /[\w_]/;
  comment_start = '//';
  multiline_comment_start = '/*';
  comment_end = '*/';
  escape = function(it){
    switch (it) {
    case '<':
      return '&lt;';
    case '>':
      return '&gt;';
    case '"':
      return '&quot;';
    case '&':
      return '&amp;';
    default:
      return it;
    }
  };
  Token = (function(){
    Token.displayName = 'Token';
    var prototype = Token.prototype, constructor = Token;
    function Token(type, text, src, line, column){
      this.type = type;
      this.text = text;
      this.src = src;
      this.line = line;
      this.column = column;
    }
    prototype.xml = function(indent){
      return __repeatString(' ', indent) + "<" + this.type + ">" + escape(this.text) + "</" + this.type + ">";
    };
    return Token;
  }());
  lex = function(input){
    var lines, line, line_start, error, tokens, push, len, i, c, integer, start, string, ident;
    lines = input.split(/\n/).map(function(it){
      return it.replace(/\t/, ' ');
    });
    line = 0;
    line_start = 0;
    error = function(it){
      var src, column, indicator;
      src = lines[line];
      column = i - line_start;
      indicator = __repeatString('-', column - 1) + '^';
      throw new Error(it + " on line " + (line + 1) + ", column " + (column + 1) + ": \n" + src + "\n" + indicator);
    };
    tokens = [];
    push = function(type, text){
      return tokens.push(new Token(type, text, lines[line], line, i - line_start));
    };
    len = input.length;
    i = 0;
    while (i < len) {
      c = input[i];
      if (c === '\n') {
        ++line;
        line_start = i;
        ++i;
      } else if (/\s/.test(c)) {
        ++i;
      } else if (input.substr(i, 2) === comment_start) {
        while (i < len && input[i] !== '\n') {
          ++i;
        }
      } else if (input.substr(i, 2) === multiline_comment_start) {
        do {
          ++i;
        } while (i < len && input.substr(i, 2) !== comment_end);
        i += 2;
      } else if (symbol.test(c)) {
        push('symbol', c);
        ++i;
      } else if (digit.test(c)) {
        integer = c;
        start = i;
        while (++i < len) {
          c = input[i];
          if (symbol.test(c)) {
            break;
          }
          if (!digit.test(c)) {
            error("invalid number");
          }
          integer += c;
        }
        tokens.push(new Token('integerConstant', integer, lines[line], line, start - line_start));
      } else if (c === string_literal) {
        string = '';
        start = i;
        while (++i) {
          if (i > len) {
            error("unterminated string literal");
          }
          c = input[i];
          if (c === string_literal) {
            break;
          }
          if (/[\n\r]/.test(c)) {
            error("invalid newline in string literal");
          }
          string += c;
        }
        tokens.push(new Token('stringConstant', string, lines[line], line, start - line_start));
        ++i;
      } else if (identifier_start.test(c)) {
        ident = c;
        start = i;
        while (++i < len && identifier.test(c = input[i])) {
          ident += c;
        }
        tokens.push(new Token(keywords.test(ident) ? 'keyword' : 'identifier', ident, lines[line], line, start - line_start));
      } else {
        error("invalid syntax " + c);
      }
    }
    return tokens;
  };
  Element = (function(){
    Element.displayName = 'Element';
    var prototype = Element.prototype, constructor = Element;
    function Element(name){
      this.name = name;
      this.contents = [];
    }
    prototype.push = function(it){
      return this.contents.push(it);
    };
    prototype.xml = function(indent){
      var indents;
      indents = __repeatString(' ', indent);
      return "" + indents + "<" + this.name + ">\n" + this.contents.map(function(it){
        return it.xml(indent + 1);
      }).join('\n') + "\n" + indents + "</" + this.name + ">";
    };
    return Element;
  }());
  parser = {
    error: function(){
      var src, line, column, indicator, _ref;
      _ref = this.token, src = _ref.src, line = _ref.line, column = _ref.column;
      src = src.replace(/\t/, ' ');
      indicator = __repeatString('-', column - 1) + '^';
      throw new Error("Unexpected " + this.token.type + " on line " + (line + 1) + ", column " + (column + 1) + ":\n" + src + "\n" + indicator + "\n\nSyntax tree:	\n" + this.root.xml(0));
    },
    parse: function(it){
      this.tokens = lex(it);
      this.root = this.el = new Element('class');
      this.stack = [];
      this['class']();
      return this.root.xml(0);
    },
    get next(){
      return this.token = this.tokens.shift() || (function(){
        throw new Error("unexpected end of file!");
      }());
    },
    get peek(){
      return this.tokens[0] || {
        text: 'EOF',
        type: 'EOF'
      };
    },
    start: function(it){
      var parent;
      parent = this.el;
      this.stack.push(parent);
      console.log("Starting element " + it + " inside " + parent.name);
      this.el = new Element(it);
      return parent.push(this.el);
    },
    end: function(){
      var parent;
      parent = this.stack.pop();
      console.log("ending " + this.el.name + " back into " + parent.name);
      return this.el = parent;
    },
    push: function(type, text){
      var t;
      t = this.next;
      if (text && !Array.isArray(text)) {
        text = [text];
      }
      if (t.type === type && (!text || (text && text.indexOf(t.text) !== -1))) {
        console.log("pushing " + this.token.text + " into " + this.el.name);
        return this.el.push(t);
      } else {
        return this.error();
      }
    },
    'class': function(){
      this.push('keyword', 'class');
      this.push('identifier');
      this.push('symbol', '{');
      while (this.peek.text === 'static' || this.peek.text === 'field') {
        this.classVarDec();
      }
      while (this.peek.text === 'constructor' || this.peek.text === 'function' || this.peek.text === 'method') {
        this.subroutineDec();
      }
      return this.push('symbol', '}');
    },
    classVarDec: function(){
      this.start('classVarDec');
      this.push('keyword', ['static', 'field']);
      this.type();
      this.push('identifier');
      while (this.peek.text !== ';') {
        this.push('symbol', ',');
        this.push('identifier');
      }
      this.push('symbol', ';');
      return this.end();
    },
    type: function(){
      if (this.peek.type === 'identifier') {
        return this.push('identifier');
      } else {
        return this.push('keyword', ['int', 'char', 'boolean']);
      }
    },
    subroutineDec: function(){
      this.start('subroutineDec');
      this.push('keyword', ['constructor', 'function', 'method']);
      if (this.peek.text === 'void') {
        this.push('keyword', 'void');
      } else {
        this.type();
      }
      this.push('identifier');
      this.push('symbol', '(');
      this.parameterList();
      this.push('symbol', ')');
      this.subroutineBody();
      return this.end();
    },
    parameterList: function(){
      this.start('parameterList');
      while (this.peek.text !== ')') {
        this.type();
        this.push('identifier');
        if (this.peek.text !== ')') {
          this.push('symbol', ',');
        }
      }
      return this.end();
    },
    subroutineBody: function(){
      this.start('subroutineBody');
      this.push('symbol', '{');
      while (this.peek.text === 'var') {
        this.varDec();
      }
      this.statements();
      this.push('symbol', '}');
      return this.end();
    },
    varDec: function(){
      this.start('varDec');
      this.push('keyword', 'var');
      this.type();
      this.push('identifier');
      while (this.peek.text !== ';') {
        this.push('symbol', ',');
        this.push('identifier');
      }
      this.push('symbol', ';');
      return this.end();
    },
    statements: function(){
      this.start('statements');
      if (this.peek.text !== '}') {
        while (this.peek.type === 'keyword') {
          switch (this.peek.text) {
          case 'let':
            this.letStatement();
            break;
          case 'if':
            this.ifStatement();
            break;
          case 'while':
            this.whileStatement();
            break;
          case 'do':
            this.doStatement();
            break;
          case 'return':
            this.returnStatement();
            break;
          default:
            this.error();
          }
        }
      }
      return this.end();
    },
    letStatement: function(){
      this.start('letStatement');
      this.push('keyword', 'let');
      this.push('identifier');
      if (this.peek.text === '[') {
        this.push('symbol', '[');
        this.expression();
        this.push('symbol', ']');
      }
      this.push('symbol', '=');
      this.expression();
      this.push('symbol', ';');
      return this.end();
    },
    ifStatement: function(){
      this.start('ifStatement');
      this.push('keyword', 'if');
      this.push('symbol', '(');
      this.expression();
      this.push('symbol', ')');
      this.push('symbol', '{');
      this.statements();
      this.push('symbol', '}');
      if (this.peek.text === 'else') {
        this.push('keyword', 'else');
        this.push('symbol', '{');
        this.statements();
        this.push('symbol', '}');
      }
      return this.end();
    },
    whileStatement: function(){
      this.start('whileStatement');
      this.push('keyword', 'while');
      this.push('symbol', '(');
      this.expression();
      this.push('symbol', ')');
      this.push('symbol', '{');
      this.statements();
      this.push('symbol', '}');
      return this.end();
    },
    doStatement: function(){
      this.start('doStatement');
      this.push('keyword', 'do');
      this.subroutineCall();
      this.push('symbol', ';');
      return this.end();
    },
    returnStatement: function(){
      this.start('returnStatement');
      this.push('keyword', 'return');
      if (this.peek.text !== ';') {
        this.expression();
      }
      this.push('symbol', ';');
      return this.end();
    },
    expression: function(){
      this.start('expression');
      this.term();
      if (['+', '-', '*', '/', '&', '|', '<', '>', '='].indexOf(this.peek.text) !== -1) {
        this.push('symbol');
        this.term();
      }
      return this.end();
    },
    term: function(){
      var peek2, _ref;
      this.start('term');
      if (this.peek.type === 'integerConstant') {
        this.push('integerConstant');
      } else if (this.peek.type === 'stringConstant') {
        this.push('stringConstant');
      } else if (['true', 'false', 'null', 'this'].indexOf(this.peek.text) !== -1) {
        this.push('keyword');
      } else if (this.peek.text === '(') {
        this.push('symbol', '(');
        this.expression();
        this.push('symbol', ')');
      } else if (this.peek.type === 'identifier') {
        peek2 = (_ref = this.tokens[1]) != null ? _ref.text : void 8;
        if (peek2 === '[') {
          this.push('identifier');
          this.push('symbol', '[');
          this.expression();
          this.push('symbol', ']');
        } else if (peek2 === '(' || peek2 === '.') {
          this.subroutineCall();
        } else {
          this.push('identifier');
        }
      } else {
        this.push('symbol', ['~', '-']);
        this.term();
      }
      return this.end();
    },
    subroutineCall: function(){
      this.push('identifier');
      if (this.peek.text === '.') {
        this.push('symbol', '.');
        this.push('identifier');
      }
      this.push('symbol', '(');
      this.expressionList();
      return this.push('symbol', ')');
    },
    expressionList: function(){
      this.start('expressionList');
      while (this.peek.text !== ')') {
        this.expression();
        if (this.peek.text !== ')') {
          this.push('symbol', ',');
        }
      }
      return this.end();
    }
  };
  die = function(it){
    console.error(it);
    return process.exit(1);
  };
  infile = ((_ref = process.argv[2]) != null ? _ref.replace(/\\/g, '/') : void 8) || die("Usage: jack.js <infile.jack> or <directory containing .jack files>");
  if (fs.statSync(infile).isDirectory()) {
    for (_i = 0, _len = (_ref = fs.readdirSync(infile)).length; _i < _len; ++_i) {
      file = _ref[_i];
      if (/\.jack$/.test(file)) {
        fs.writeFileSync(infile + "/" + file.replace(/\.jack$/, '.test.xml'), parser.parse(fs.readFileSync(infile + "/" + file, 'utf8')));
      }
    }
  } else {
    fs.writeFileSync(infile.replace(/\.jack/, '.test.xml'), parser.parse(fs.readFileSync(infile, 'utf8')));
  }
  function __repeatString(str, n){
    for (var r = ''; n > 0; (n >>= 1) && (str += str)) if (n & 1) r += str;
    return r;
  }
}).call(this);
