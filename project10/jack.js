(function(){
  var fs, die, lines, symbols, keywords, digit, string_constant, allowed_chars, identifier_start, identifier, comment_start, comment_end, escape, to_xml, lex, infile, file, _ref, _i, _len;
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
  symbols = /[\{\}\(\)\[\]\.,;\+\-\*\/&\|<>=~]/;
  keywords = /^(?:class|constructor|function|method|field|static|var|int|char|boolean|void|true|false|null|this|let|do|if|else|while|return)$/;
  digit = /\d/;
  string_constant = /"/;
  allowed_chars = /[^"\n\r]/;
  identifier_start = /[A-Za-z_]/;
  identifier = /[\w_]/;
  comment_start = /\/\*/;
  comment_end = /\*\//;
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
  lex = function(it){
    var tokens, len, i, c, integer, string, ident;
    it = it.replace(/\/\/.+/mg, '').replace(/\s+/g, ' ').trim();
    tokens = [];
    len = it.length;
    i = 0;
    while (i < len) {
      c = it[i];
      if (c === ' ') {
        ++i;
        continue;
      }
      if (comment_start.test(it.substr(i, 2))) {
        do {
          ++i;
        } while (i < len && !comment_end.test(it.substr(i, 2)));
        i += 2;
      } else if (symbols.test(c)) {
        tokens.push(['symbol', c]);
        ++i;
      } else if (digit.test(c)) {
        integer = '';
        do {
          integer += c;
        } while (++i < len && digit.test(c = it[i]));
        tokens.push(['integerConstant', integer]);
      } else if (string_constant.test(c)) {
        string = '';
        while (++i < len && allowed_chars.test(c = it[i])) {
          string += c;
        }
        tokens.push(['stringConstant', string]);
        ++i;
      } else if (identifier_start.test(c)) {
        ident = '';
        do {
          ident += c;
        } while (++i < len && identifier.test(c = it[i]));
        tokens.push([keywords.test(ident) ? 'keyword' : 'identifier', ident]);
      } else {
        throw new Error("invalid syntax: " + c);
      }
    }
    return "<tokens>\n" + tokens.map(to_xml).join('\n') + "\n</tokens>";
  };
  infile = ((_ref = process.argv[2]) != null ? _ref.replace(/\\/g, '/') : void 8) || die("Usage: jack.js <infile.jack> or <directory containing .jack files>");
  if (fs.statSync(infile).isDirectory()) {
    for (_i = 0, _len = (_ref = fs.readdirSync(infile)).length; _i < _len; ++_i) {
      file = _ref[_i];
      if (/\.jack$/.test(file)) {
        fs.writeFileSync(infile + "/" + file.replace(/\.jack$/, '.test.xml'), lex(fs.readFileSync(infile + "/" + file, 'utf8')));
      }
    }
  } else {
    fs.writeFileSync(infile.replace(/\.jack/, '.xml'), lex({
      name: infile,
      input: fs.readFileSync(infile, 'utf8')
    }));
  }
}).call(this);
