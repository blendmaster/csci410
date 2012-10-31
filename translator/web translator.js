(function(){
  var lines, translate, debounce, webtranslate;
  lines = function(){
    return Array.prototype.join.call(arguments, '\n');
  };
  translate = function(filename, input){
    var arithmetic, unary, boolean, load_from_base, addr_from_base, push_segment, pop_segment, pop_d;
    if (input === '') {
      return '';
    }
    filename = filename.replace(/\//g, '');
    arithmetic = {
      add: '+',
      sub: '-',
      and: '&',
      or: '|'
    };
    unary = {
      neg: '-',
      not: '!'
    };
    boolean = {
      eq: 'JEQ',
      gt: 'JGT',
      lt: 'JLT'
    };
    load_from_base = function(base){
      return function(it){
        return lines("@" + base, 'D=M', "@" + it, 'A=D+A', 'D=M');
      };
    };
    addr_from_base = function(base){
      return function(it){
        return lines("@" + base, 'D=M', "@" + it, 'D=D+A');
      };
    };
    push_segment = {
      constant: function(it){
        return lines("@" + it, 'D=A');
      },
      argument: load_from_base('ARG'),
      local: load_from_base('LCL'),
      'this': load_from_base('THIS'),
      that: load_from_base('THAT'),
      temp: function(it){
        return lines('@5', 'D=A', "@" + it, 'A=D+A', 'D=M');
      },
      pointer: function(it){
        return lines('@3', 'D=A', "@" + it, 'A=D+A', 'D=M');
      },
      'static': function(it){
        return lines("@" + filename + "." + it, 'D=M');
      }
    };
    pop_segment = {
      argument: addr_from_base('ARG'),
      local: addr_from_base('LCL'),
      'this': addr_from_base('THIS'),
      that: addr_from_base('THAT'),
      temp: function(it){
        return lines('@5', 'D=A', "@" + it, 'D=D+A');
      },
      pointer: function(it){
        return lines('@3', 'D=A', "@" + it, 'D=D+A');
      },
      'static': function(it){
        return lines("@" + filename + "." + it, 'D=A');
      }
    };
    pop_d = lines('@SP', 'M=M-1', 'A=M', 'D=M', 'A=A-1');
    return input.replace(/\/\/.*/gm, "").trim().split(/\s*[\n\r]+\s*/).map(function(it, i){
      var that;
      if (that = it.match(/push (constant|argument|local|static|this|that|pointer|temp) (\d+)/)) {
        return lines(push_segment[that[1]](that[2]), '@SP', 'M=M+1', 'A=M-1', 'M=D');
      } else if (that = it.match(/pop (argument|local|static|this|that|pointer|temp) (\d+)/)) {
        return lines(pop_segment[that[1]](that[2]), '@SP', 'M=M-1', 'A=M+1', 'M=D', 'A=A-1', 'D=M', 'A=A+1', 'A=M', 'M=D');
      } else if (that = arithmetic[it]) {
        return lines(pop_d, "M=M" + that + "D");
      } else if (that = boolean[it]) {
        return lines(pop_d, 'D=M-D', "@" + filenameBooleanTrue + "-" + i, "D;" + that, 'D=0', "@" + filenameBooleanEnd + "-" + i, 'A;JMP', "(" + filenameBooleanTrue + "-" + i + ")", 'D=-1', "(" + filenameBooleanEnd + "-" + i + ")", '@SP', 'A=M-1', 'M=D');
      } else if (that = unary[it]) {
        return lines('@SP', 'A=M-1', "M=" + that + "M");
      } else {
        throw new Error("couldn't parse \"" + it + "\" around line " + i + " in file \"" + filename + "\"!");
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
  webtranslate = function(){
    var e;
    try {
      document.getElementById('assembly').value = translate('web', document.getElementById('vm').value);
      return document.getElementById('error').hidden = true;
    } catch (e$) {
      e = e$;
      document.getElementById('error').hidden = false;
      return document.getElementById('error').textContent = e;
    }
  };
  document.addEventListener('DOMContentLoaded', function(){
    webtranslate();
    return document.getElementById('vm').addEventListener('input', debounce(500, webtranslate));
  });
}).call(this);
