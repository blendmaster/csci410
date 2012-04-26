(function(){
  var fs, lines, symbol, keywords, digit, string_literal, identifier_start, identifier, comment_start, multiline_comment_start, comment_end, Token, lex, compile_all, Class, Subroutine, Constructor, JackFunction, Method, Statement, LetStatement, IfStatement, WhileStatement, DoStatement, ReturnStatement, Expression, IntegerConstant, StringConstant, KeywordConstant, ArrayReference, VariableReference, SubroutineCall, Unary, parser, compile, die, infile, file, _ref, _i, _len;
  fs = require('fs');
  lines = function(){
    return Array.prototype.filter.call(arguments, function(it){
      return it != null;
    }).join('\n');
  };
  symbol = /[\{\}\(\)\[\]\.,;\+\-\*\/&\|<>=~]/;
  keywords = /^(?:class|constructor|function|method|field|static|var|int|char|boolean|void|true|false|null|this|let|do|if|else|while|return)$/;
  digit = /\d/;
  string_literal = '"';
  identifier_start = /[A-Za-z_]/;
  identifier = /[\w_]/;
  comment_start = '//';
  multiline_comment_start = '/*';
  comment_end = '*/';
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
    return Token;
  }());
  lex = function(_arg){
    var name, input, lines, line, line_start, error, tokens, push, len, i, c, integer, start, string, ident;
    name = _arg.name, input = _arg.input;
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
      throw new Error(name + ": " + it + " on line " + (line + 1) + ", column " + (column + 1) + ": \n" + src + "\n" + indicator);
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
          if (input[i] === '\n') {
            ++line;
            line_start = i;
          }
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
          if (c === ' ') {
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
  compile_all = function(it){
    if (it.length) {
      return it.map(function(it){
        return it.compile();
      }).join('\n');
    }
  };
  Class = (function(){
    Class.displayName = 'Class';
    var prototype = Class.prototype, constructor = Class;
    function Class(name){
      this.name = name;
      this.fields = Object.create(null);
      this.statics = Object.create(null);
      this.subroutines = Object.create(null);
      this.static_idx = 0;
      this.field_idx = 0;
    }
    prototype['static'] = function(type, name){
      if (this.statics[name] || this.fields[name]) {
        throw new Error("class " + this.name + " has a duplicate class variable \"" + name + "\"!");
      }
      return this.statics[name] = {
        type: type,
        idx: this.static_idx++
      };
    };
    prototype.field = function(type, name){
      if (this.statics[name] || this.fields[name]) {
        throw new Error("class " + this.name + " has a duplicate class variable \"" + name + "\"!");
      }
      return this.fields[name] = {
        type: type,
        idx: this.field_idx++
      };
    };
    prototype.constructor = function(return_type, name, params){
      if (this.subroutines.constructor) {
        throw new Error("class " + this.name + " has multiple construtors declared!");
      }
      return this.subroutines.constructor = new Constructor(this, return_type, name, params);
    };
    prototype['function'] = function(return_type, name, params){
      if (this.subroutines[name]) {
        throw new Error("function " + this.name + "." + name + " is already defined!");
      }
      return this.subroutines[name] = new JackFunction(this, return_type, name, params);
    };
    prototype.method = function(return_type, name, params){
      if (this.subroutines[name]) {
        throw new Error("method " + this.name + "." + name + " is already defined!");
      }
      return this.subroutines[name] = new Method(this, return_type, name, params);
    };
    prototype.compile = function(){
      var name, sub;
      return (function(){
        var _ref, _results = [];
        for (name in _ref = this.subroutines) {
          sub = _ref[name];
          _results.push(sub.compile());
        }
        return _results;
      }.call(this)).join('\n');
    };
    return Class;
  }());
  Subroutine = (function(){
    Subroutine.displayName = 'Subroutine';
    var prototype = Subroutine.prototype, constructor = Subroutine;
    function Subroutine($class, return_type, name){
      this['class'] = $class;
      this.return_type = return_type;
      this.name = name;
      this.locals = Object.create(null);
      this.args = Object.create(null);
      this.args_idx = 0;
      this.local_idx = 0;
      this.whiles = 0;
      this.ifs = 0;
    }
    prototype.argument = function(type, name){
      if (this.args[name] || this['class'].statics[name] || this['class'].fields[name]) {
        throw new Error("method " + this['class'].name + "." + this.name + " has a duplicate argument \"" + name + "\"!");
      }
      return this.args[name] = {
        type: type,
        idx: this.args_idx++
      };
    };
    prototype.local = function(type, name){
      if (this.locals[name] || this.args[name] || this['class'].statics[name] || this['class'].fields[name]) {
        throw new Error("method " + this['class'].name + "." + this.name + " has a duplicate local variable \"" + name + "\"!");
      }
      return this.locals[name] = {
        type: type,
        idx: this.local_idx++
      };
    };
    prototype.compile = function(){
      return lines("function " + this['class'].name + "." + this.name + " " + Object.keys(this.locals).length, compile_all(this.statements));
    };
    prototype.resolve = function(it){
      var that;
      if (that = this.args[it]) {
        return "argument " + that.idx;
      } else if (that = this.locals[it]) {
        return "local " + that.idx;
      } else if (that = this['class'].statics[it]) {
        return "static " + that.idx;
      } else {
        throw new Error("undefined variable \"" + name + "\" in method " + this['class'].name + "." + this.name + "!");
      }
    };
    prototype.find = function(it){
      return this.args[it] || this.locals[it] || this['class'].statics[it];
    };
    return Subroutine;
  }());
  Constructor = (function(superclass){
    Constructor.displayName = 'Constructor';
    var prototype = __extend(Constructor, superclass).prototype, constructor = Constructor;
    function Constructor(){
      superclass.apply(this, arguments);
    }
    prototype.compile = function(){
      return lines("function " + this['class'].name + "." + this.name + " " + Object.keys(this.locals).length, "push constant " + Object.keys(this['class'].fields).length, "call Memory.alloc 1", "pop pointer 0", compile_all(this.statements));
    };
    prototype.resolve = function(it){
      var that;
      if (that = this['class'].fields[it]) {
        return "this " + that.idx;
      } else {
        return superclass.prototype.resolve.apply(this, arguments);
      }
    };
    prototype.find = function(it){
      return this['class'].fields[it] || superclass.prototype.find.apply(this, arguments);
    };
    return Constructor;
  }(Subroutine));
  JackFunction = (function(superclass){
    JackFunction.displayName = 'JackFunction';
    var prototype = __extend(JackFunction, superclass).prototype, constructor = JackFunction;
    function JackFunction(){
      superclass.apply(this, arguments);
    }
    return JackFunction;
  }(Subroutine));
  Method = (function(superclass){
    Method.displayName = 'Method';
    var prototype = __extend(Method, superclass).prototype, constructor = Method;
    function Method(){
      superclass.apply(this, arguments);
    }
    prototype.compile = function(){
      return lines("function " + this['class'].name + "." + this.name + " " + Object.keys(this.locals).length, 'push argument 0', 'pop pointer 0', compile_all(this.statements));
    };
    prototype.resolve = function(it){
      var that;
      if (that = this['class'].fields[it]) {
        return "this " + that.idx;
      } else {
        return superclass.prototype.resolve.apply(this, arguments);
      }
    };
    prototype.find = function(it){
      return this['class'].fields[it] || superclass.prototype.find.apply(this, arguments);
    };
    return Method;
  }(Subroutine));
  Statement = (function(){
    Statement.displayName = 'Statement';
    var prototype = Statement.prototype, constructor = Statement;
    function Statement(){}
    prototype.resolve = function(it){
      return this.subroutine.resolve(it);
    };
    return Statement;
  }());
  LetStatement = (function(superclass){
    LetStatement.displayName = 'LetStatement';
    var prototype = __extend(LetStatement, superclass).prototype, constructor = LetStatement;
    function LetStatement(subroutine, variable, array_idx, value){
      this.subroutine = subroutine;
      this.variable = variable;
      this.array_idx = array_idx;
      this.value = value;
    }
    prototype.compile = function(){
      if (this.array_idx) {
        return lines(this.array_idx.compile(), "push " + this.resolve(this.variable), 'add', this.value.compile(), 'pop temp 0', 'pop pointer 1', 'push temp 0', 'pop that 0');
      } else {
        return lines(this.value.compile(), "pop " + this.resolve(this.variable));
      }
    };
    return LetStatement;
  }(Statement));
  IfStatement = (function(superclass){
    IfStatement.displayName = 'IfStatement';
    var prototype = __extend(IfStatement, superclass).prototype, constructor = IfStatement;
    function IfStatement(subroutine, test, body, else_body){
      this.subroutine = subroutine;
      this.test = test;
      this.body = body;
      this.else_body = else_body;
    }
    prototype.compile = function(){
      var label, that;
      label = this.subroutine.ifs++;
      return lines(this.test.compile(), "if-goto IF_TRUE" + label, "goto IF_FALSE" + label, "label IF_TRUE" + label, compile_all(this.body), this.else_body ? "goto IF_END" + label : void 8, "label IF_FALSE" + label, (that = this.else_body) ? lines(compile_all(that), "label IF_END" + label) : void 8);
    };
    return IfStatement;
  }(Statement));
  WhileStatement = (function(superclass){
    WhileStatement.displayName = 'WhileStatement';
    var prototype = __extend(WhileStatement, superclass).prototype, constructor = WhileStatement;
    function WhileStatement(subroutine, test, body){
      this.subroutine = subroutine;
      this.test = test;
      this.body = body;
    }
    prototype.compile = function(){
      var label;
      label = this.subroutine.whiles++;
      return lines("label WHILE_EXP" + label, this.test.compile(), 'not', "if-goto WHILE_END" + label, compile_all(this.body), "goto WHILE_EXP" + label, "label WHILE_END" + label);
    };
    return WhileStatement;
  }(Statement));
  DoStatement = (function(superclass){
    DoStatement.displayName = 'DoStatement';
    var prototype = __extend(DoStatement, superclass).prototype, constructor = DoStatement;
    function DoStatement(subroutine, call){
      this.subroutine = subroutine;
      this.call = call;
    }
    prototype.compile = function(){
      return lines(this.call.compile(), 'pop temp 0');
    };
    return DoStatement;
  }(Statement));
  ReturnStatement = (function(superclass){
    ReturnStatement.displayName = 'ReturnStatement';
    var prototype = __extend(ReturnStatement, superclass).prototype, constructor = ReturnStatement;
    function ReturnStatement(subroutine, expr){
      this.subroutine = subroutine;
      this.expr = expr;
    }
    prototype.compile = function(){
      if (this.subroutine.return_type === 'void') {
        return lines('push constant 0', 'return');
      } else if (this.expr) {
        return lines(this.expr.compile(), 'return');
      } else {
        return 'return';
      }
    };
    return ReturnStatement;
  }(Statement));
  Expression = (function(){
    Expression.displayName = 'Expression';
    var op, prototype = Expression.prototype, constructor = Expression;
    function Expression(left, op, right){
      this.left = left;
      this.op = op;
      this.right = right;
    }
    prototype.compile = function(){
      return lines(this.left.compile(), this.op ? lines(this.right.compile(), op[this.op]) : void 8);
    };
    op = {
      '-': 'sub',
      '+': 'add',
      '*': 'call Math.multiply 2',
      '/': 'call Math.divide 2',
      '&': 'and',
      '|': 'or',
      '<': 'lt',
      '>': 'gt',
      '=': 'eq'
    };
    return Expression;
  }());
  IntegerConstant = (function(){
    IntegerConstant.displayName = 'IntegerConstant';
    var prototype = IntegerConstant.prototype, constructor = IntegerConstant;
    function IntegerConstant(value){
      this.value = value;
    }
    prototype.compile = function(){
      return "push constant " + this.value;
    };
    return IntegerConstant;
  }());
  StringConstant = (function(){
    StringConstant.displayName = 'StringConstant';
    var prototype = StringConstant.prototype, constructor = StringConstant;
    function StringConstant(value){
      this.value = value;
    }
    prototype.compile = function(){
      var char;
      return lines("push constant " + this.value.length, "call String.new 1", (function(){
        var _i, _ref, _len, _results = [];
        for (_i = 0, _len = (_ref = this.value).length; _i < _len; ++_i) {
          char = _ref[_i];
          _results.push(lines("push constant " + char.charCodeAt(0), "call String.appendChar 2"));
        }
        return _results;
      }.call(this)).join('\n'));
    };
    return StringConstant;
  }());
  KeywordConstant = (function(){
    KeywordConstant.displayName = 'KeywordConstant';
    var keyword, prototype = KeywordConstant.prototype, constructor = KeywordConstant;
    function KeywordConstant(keyword){
      this.keyword = keyword;
    }
    prototype.compile = function(){
      return keyword[this.keyword];
    };
    keyword = {
      'true': 'push constant 0\nnot',
      'false': 'push constant 0',
      'null': 'push constant 0',
      'this': 'push pointer 0'
    };
    return KeywordConstant;
  }());
  ArrayReference = (function(){
    ArrayReference.displayName = 'ArrayReference';
    var prototype = ArrayReference.prototype, constructor = ArrayReference;
    function ArrayReference(subroutine, variable, array_idx){
      this.subroutine = subroutine;
      this.variable = variable;
      this.array_idx = array_idx;
    }
    prototype.compile = function(){
      return lines(this.array_idx.compile(), "push " + this.subroutine.resolve(this.variable), 'add', 'pop pointer 1', 'push that 0');
    };
    return ArrayReference;
  }());
  VariableReference = (function(){
    VariableReference.displayName = 'VariableReference';
    var prototype = VariableReference.prototype, constructor = VariableReference;
    function VariableReference(subroutine, variable){
      this.subroutine = subroutine;
      this.variable = variable;
    }
    prototype.compile = function(){
      return "push " + this.subroutine.resolve(this.variable);
    };
    return VariableReference;
  }());
  SubroutineCall = (function(){
    SubroutineCall.displayName = 'SubroutineCall';
    var prototype = SubroutineCall.prototype, constructor = SubroutineCall;
    function SubroutineCall(subroutine, scope_name, method_name, args){
      this.subroutine = subroutine;
      this.scope_name = scope_name;
      this.method_name = method_name;
      this.args = args;
    }
    prototype.compile = function(){
      var that;
      if (that = this.subroutine.find(this.scope_name)) {
        return lines("push " + this.subroutine.resolve(this.scope_name), compile_all(this.args), "call " + that.type + "." + this.method_name + " " + (this.args.length + 1));
      } else if (!this.scope_name) {
        return lines('push pointer 0', compile_all(this.args), "call " + this.subroutine['class'].name + "." + this.method_name + " " + (this.args.length + 1));
      } else {
        return lines(compile_all(this.args), "call " + this.scope_name + "." + this.method_name + " " + this.args.length);
      }
    };
    return SubroutineCall;
  }());
  Unary = (function(){
    Unary.displayName = 'Unary';
    var ops, prototype = Unary.prototype, constructor = Unary;
    function Unary(op, term){
      this.op = op;
      this.term = term;
    }
    prototype.compile = function(){
      return lines(this.term.compile(), ops[this.op]);
    };
    ops = {
      '~': 'not',
      '-': 'neg'
    };
    return Unary;
  }());
  parser = {
    parse: function(name, tokens){
      this.name = name;
      this.tokens = tokens;
      this.className = this.name.replace(/.jack$/, '');
      this['class'] = new Class(this.className);
      this.push('keyword', 'class');
      if (this.push('identifier') !== this.className) {
        throw new Error("the file " + this.name + " can only declare the class " + this.className + "!");
      }
      this.push('symbol', '{');
      while (this.peek.text === 'static' || this.peek.text === 'field') {
        this.classVarDec();
      }
      while (this.peek.text === 'constructor' || this.peek.text === 'function' || this.peek.text === 'method') {
        this.subroutineDec();
      }
      this.push('symbol', '}');
      return this['class'];
    },
    error: function(type, text){
      var src, line, column, indicator, _ref;
      _ref = this.token, src = _ref.src, line = _ref.line, column = _ref.column;
      src = src.replace(/\t/, ' ');
      indicator = __repeatString('-', column - 1) + '^';
      throw new Error("" + this.name + ": Expecting " + type + " " + (text ? "\"" + text + "\"" : '') + ", found " + this.token.type + " \"" + this.token.text + "\" on line " + (line + 1) + ", column " + (column + 1) + ":\n" + src + "\n" + indicator);
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
    push: function(type, text){
      var t;
      t = this.next;
      if (text && !Array.isArray(text)) {
        text = [text];
      }
      if (!(t.type === type && (!text || (text && text.indexOf(t.text) !== -1)))) {
        this.error(type, text);
      }
      return t.text;
    },
    classVarDec: function(){
      var class_var_type, var_type;
      class_var_type = this.push('keyword', ['static', 'field']);
      var_type = this.type();
      this['class'][class_var_type](var_type, this.push('identifier'));
      while (this.peek.text !== ';') {
        this.push('symbol', ',');
        this['class'][class_var_type](var_type, this.push('identifier'));
      }
      this.push('symbol', ';');
    },
    type: function(){
      if (this.peek.type === 'identifier') {
        return this.push('identifier');
      } else {
        return this.push('keyword', ['int', 'char', 'boolean']);
      }
    },
    subroutineDec: function(){
      var type, return_type, name;
      type = this.push('keyword', ['constructor', 'function', 'method']);
      return_type = this.peek.text === 'void'
        ? this.push('keyword', 'void')
        : this.type();
      name = this.push('identifier');
      this.subroutine = this['class'][type](return_type, name);
      this.push('symbol', '(');
      this.parameterList();
      this.push('symbol', ')');
      this.subroutineBody();
    },
    parameterList: function(){
      while (this.peek.text !== ')') {
        this.subroutine.argument(this.type(), this.push('identifier'));
        if (this.peek.text !== ')') {
          this.push('symbol', ',');
        }
      }
    },
    subroutineBody: function(){
      this.push('symbol', '{');
      while (this.peek.text === 'var') {
        this.varDec();
      }
      this.subroutine.statements = this.statements();
      this.push('symbol', '}');
    },
    varDec: function(){
      var type, name;
      this.push('keyword', 'var');
      type = this.type();
      name = this.push('identifier');
      this.subroutine.local(type, name);
      while (this.peek.text !== ';') {
        this.push('symbol', ',');
        name = this.push('identifier');
        this.subroutine.local(type, name);
      }
      this.push('symbol', ';');
    },
    statements: function(){
      var _results = [];
      while (this.peek.type === 'keyword') {
        switch (this.peek.text) {
        case 'let':
          _results.push(this.letStatement());
          break;
        case 'if':
          _results.push(this.ifStatement());
          break;
        case 'while':
          _results.push(this.whileStatement());
          break;
        case 'do':
          _results.push(this.doStatement());
          break;
        case 'return':
          _results.push(this.returnStatement());
          break;
        default:
          _results.push(this.error());
        }
      }
      return _results;
    },
    letStatement: function(){
      var name, array_idx, value;
      this.push('keyword', 'let');
      name = this.push('identifier');
      if (this.peek.text === '[') {
        this.push('symbol', '[');
        array_idx = this.expression();
        this.push('symbol', ']');
      }
      this.push('symbol', '=');
      value = this.expression();
      this.push('symbol', ';');
      return new LetStatement(this.subroutine, name, array_idx, value);
    },
    ifStatement: function(){
      var test, body, else_body;
      this.push('keyword', 'if');
      this.push('symbol', '(');
      test = this.expression();
      this.push('symbol', ')');
      this.push('symbol', '{');
      body = this.statements();
      this.push('symbol', '}');
      if (this.peek.text === 'else') {
        this.push('keyword', 'else');
        this.push('symbol', '{');
        else_body = this.statements();
        this.push('symbol', '}');
      }
      return new IfStatement(this.subroutine, test, body, else_body);
    },
    whileStatement: function(){
      var test, body;
      this.push('keyword', 'while');
      this.push('symbol', '(');
      test = this.expression();
      this.push('symbol', ')');
      this.push('symbol', '{');
      body = this.statements();
      this.push('symbol', '}');
      return new WhileStatement(this.subroutine, test, body);
    },
    doStatement: function(){
      var call;
      this.push('keyword', 'do');
      call = this.subroutineCall();
      this.push('symbol', ';');
      return new DoStatement(this.subroutine, call);
    },
    returnStatement: function(){
      var expr;
      this.push('keyword', 'return');
      if (this.peek.text !== ';') {
        expr = this.expression();
      }
      this.push('symbol', ';');
      return new ReturnStatement(this.subroutine, expr);
    },
    expression: function(left){
      var op, right;
      left == null && (left = this.term());
      if (['+', '-', '*', '/', '&', '|', '<', '>', '='].indexOf(this.peek.text) !== -1) {
        op = this.push('symbol');
        right = this.term();
        if (['+', '-', '*', '/', '&', '|', '<', '>', '='].indexOf(this.peek.text) !== -1) {
          right = this.expression(right);
        }
      }
      return new Expression(left, op, right);
    },
    term: function(){
      var expr, peek2, name, array_idx, op, term, _ref;
      if (this.peek.type === 'integerConstant') {
        return new IntegerConstant(this.push('integerConstant'));
      } else if (this.peek.type === 'stringConstant') {
        return new StringConstant(this.push('stringConstant'));
      } else if (['true', 'false', 'null', 'this'].indexOf(this.peek.text) !== -1) {
        return new KeywordConstant(this.push('keyword'));
      } else if (this.peek.text === '(') {
        this.push('symbol', '(');
        expr = this.expression();
        this.push('symbol', ')');
        return expr;
      } else if (this.peek.type === 'identifier') {
        peek2 = (_ref = this.tokens[1]) != null ? _ref.text : void 8;
        if (peek2 === '[') {
          name = this.push('identifier');
          this.push('symbol', '[');
          array_idx = this.expression();
          this.push('symbol', ']');
          return new ArrayReference(this.subroutine, name, array_idx);
        } else if (peek2 === '(' || peek2 === '.') {
          return this.subroutineCall();
        } else {
          return new VariableReference(this.subroutine, this.push('identifier'));
        }
      } else {
        op = this.push('symbol', ['~', '-']);
        term = this.term();
        return new Unary(op, term);
      }
    },
    subroutineCall: function(){
      var scope_name, method_name, args;
      scope_name = this.push('identifier');
      if (this.peek.text === '.') {
        this.push('symbol', '.');
        method_name = this.push('identifier');
      } else {
        method_name = scope_name;
        scope_name = void 8;
      }
      this.push('symbol', '(');
      args = this.expressionList();
      this.push('symbol', ')');
      return new SubroutineCall(this.subroutine, scope_name, method_name, args);
    },
    expressionList: function(){
      var expr, _results = [];
      while (this.peek.text !== ')') {
        expr = this.expression();
        if (this.peek.text !== ')') {
          this.push('symbol', ',');
        }
        _results.push(expr);
      }
      return _results;
    }
  };
  compile = function(it){
    return parser.parse(it.name, lex(it)).compile();
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
        fs.writeFileSync(infile + "/" + file.replace(/\.jack$/, '.vm'), compile({
          name: file,
          input: fs.readFileSync(infile + "/" + file, 'utf8')
        }));
      }
    }
  } else {
    fs.writeFileSync(infile.replace(/\.jack$/, '.vm'), compile({
      name: (_ref = infile.split('/'))[_ref.length - 1],
      input: fs.readFileSync(infile, 'utf8')
    }));
  }
  function __repeatString(str, n){
    for (var r = ''; n > 0; (n >>= 1) && (str += str)) if (n & 1) r += str;
    return r;
  }
  function __extend(sub, sup){
    function fun(){} fun.prototype = (sub.superclass = sup).prototype;
    (sub.prototype = new fun).constructor = sub;
    if (typeof sup.extended == 'function') sup.extended(sub);
    return sub;
  }
}).call(this);
