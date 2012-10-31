(function(){
  var assemble, debounce, webassemble;
  assemble = function(input){
    var comps, jumps, symbols, i, len, variables, loc, bool, pad16;
    if (input === '') {
      return '';
    }
    comps = {
      '0': '101010',
      '1': '111111',
      '-1': '111010',
      'D': '001100',
      'A': '110000',
      '!D': '001101',
      '!A': '110001',
      '-D': '001111',
      '-A': '110011',
      'D+1': '011111',
      'A+1': '110111',
      'D-1': '001110',
      'A-1': '110010',
      'D+A': '000010',
      'D-A': '010011',
      'D&A': '000000',
      'D|A': '010101',
      'M': '110000',
      '!M': '110001',
      '-M': '110011',
      'M+1': '110111',
      'M-1': '110010',
      'D+M': '000010',
      'D-M': '010011',
      'M-D': '000111',
      'D&M': '000000',
      'D|M': '010101'
    };
    jumps = {
      undefined: '000',
      JGT: '001',
      JEQ: '010',
      JGE: '011',
      JLT: '100',
      JNE: '101',
      JLE: '110',
      JMP: '111'
    };
    symbols = {
      SP: 0,
      LCL: 1,
      ARG: 2,
      THIS: 3,
      THAT: 4,
      SCREEN: 16384,
      KBD: 24576
    };
    for (i = 0; i <= 15; ++i) {
      symbols["R" + i] = i;
    }
    len = 0;
    variables = {};
    loc = 16;
    bool = function(it){
      if (it) {
        return '1';
      } else {
        return '0';
      }
    };
    pad16 = function(it){
      var b;
      b = it.toString(2);
      return new Array(16 - b.length + 1).join('0').concat(b);
    };
    return input.replace(/\/\/.*/gm, '').trim().split(/\s+/).filter(function(it, i){
      var that;
      if (that = it.match(/\(([A-Za-z\._$:][\w\.$:]*)\)$/)) {
        symbols[that[1]] = i - len++;
        return false;
      }
      return true;
    }).map(function(it){
      var ref$, symbol, that, i$, dest, comp, jump;
      if (symbol = (ref$ = it.match(/^@(.+)$/)) != null ? ref$[1] : void 8) {
        return pad16((that = symbols[symbol]) != null
          ? that
          : !isNaN(that = parseInt(symbol, 10))
            ? that
            : (ref$ = variables[symbol]) != null
              ? ref$
              : variables[symbol] = loc++);
      } else if (that = it.match(/^(?:([AMD][MD]?[D]?)=)?(?:([01!+&|DAM\-]+))(?:;(\w+))?$/)) {
        i$ = that.length - 3, dest = that[i$], comp = that[i$ + 1], jump = that[i$ + 2];
        return '111' + bool(/M/.test(comp)) + (comps[comp] || (function(){
          throw "invalid comp in \"" + it + "\"";
        }())) + (dest ? bool(/A/.test(dest)) + bool(/D/.test(dest)) + bool(/M/.test(dest)) : '000') + (jumps[jump] || (function(){
          throw "invalid jump in \"" + it + "\"";
        }()));
      } else {
        throw "invalid instruction: \"" + it + "\"";
      }
    }).join('\n');
  };
  debounce = function(delay, func){
    var timeout;
    timeout = null;
    return function(){
      var context, args, later, timeout;
      context = this;
      args = arguments;
      later = function(){
        timeout = null;
        return func.apply(context, args);
      };
      clearTimeout(timeout);
      return timeout = setTimeout(later, delay);
    };
  };
  webassemble = function(){
    var e;
    try {
      document.getElementById('code').value = assemble(document.getElementById('assembly').value);
      return document.getElementById('error').hidden = true;
    } catch (e$) {
      e = e$;
      document.getElementById('error').hidden = false;
      return document.getElementById('error').textContent = e;
    }
  };
  document.addEventListener('DOMContentLoaded', function(){
    webassemble();
    return document.getElementById('assembly').addEventListener('input', debounce(500, webassemble));
  });
}).call(this);
