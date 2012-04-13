(function(){
  var fs, die, lines, symbol, keywords, digit, string_literal, identifier_start, identifier, comment_start, multiline_comment_start, comment_end, escape, to_xml, lex, infile, file, _ref, _i, _len;
  fs = require('fs');
  die = function(it){
    console.error(it);
    return process.exit(1);
  };
  lines = function(){
    var arg;
    return (function(_args){
      var _i, _len, _results = [];
      for (_i = 0, _len = _args.length; _i < _len; ++_i) {
        arg = _args[_i];
        if (Array.isArray(arg)) {
          _results.push(lines.apply(void 8, arg));
        } else {
          _results.push(arg);
        }
      }
      return _results;
    }(arguments)).filter(function(it){
      return it;
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
  to_xml = function(_arg){
    var tag, text;
    tag = _arg[0], text = _arg[1];
    return "\t<" + tag + "> " + escape(text) + " </" + tag + ">";
  };
  lex = function(input){
    var line, line_start, error, tokens, len, i, c, integer, string, ident;
    line = 0;
    line_start = 0;
    error = function(it){
      var src, column, indicator;
      src = input.split(/\n/)[line].replace(/\t/, ' ');
      column = i - line_start;
      indicator = __repeatString('-', column - 1) + '^';
      throw new Error(it + " on line " + (line + 1) + ", column " + (column + 1) + ": \n" + src + "\n" + indicator);
    };
    tokens = [];
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
        console.log("symbol " + c);
        tokens.push(['symbol', c]);
        ++i;
      } else if (digit.test(c)) {
        integer = c;
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
        tokens.push(['integerConstant', integer]);
      } else if (c === string_literal) {
        string = '';
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
        console.log("string: " + string);
        tokens.push(['stringConstant', string]);
        ++i;
      } else if (identifier_start.test(c)) {
        ident = c;
        while (++i < len && identifier.test(c = input[i])) {
          ident += c;
        }
        tokens.push([keywords.test(ident) ? 'keyword' : 'identifier', ident]);
        console.log("ident/keyword " + ident);
      } else {
        error("invalid syntax " + c);
      }
    }
    return "<tokens>\n" + tokens.map(to_xml).join('\n') + "\n</tokens>";
  };
  infile = ((_ref = process.argv[2]) != null ? _ref.replace(/\\/g, '/') : void 8) || die("Usage: jack.js <infile.jack> or <directory containing .jack files>");
  try {
    if (fs.statSync(infile).isDirectory()) {
      for (_i = 0, _len = (_ref = fs.readdirSync(infile)).length; _i < _len; ++_i) {
        file = _ref[_i];
        if (/\.jack$/.test(file)) {
          fs.writeFileSync(infile + "/" + file.replace(/\.jack$/, 'T.test.xml'), lex(fs.readFileSync(infile + "/" + file, 'utf8')));
        }
      }
    } else {
      fs.writeFileSync(infile.replace(/\.jack/, '.xml'), lex({
        name: infile,
        input: fs.readFileSync(infile, 'utf8')
      }));
    }
  } catch (e) {
    console.error("Error: " + e.message);
  }
  function __repeatString(str, n){
    for (var r = ''; n > 0; (n >>= 1) && (str += str)) if (n & 1) r += str;
    return r;
  }
}).call(this);
