var recast = require('recast');
var fs = require('fs');
var path = require('path');

var files = process.argv.slice(2);

function readAst(fileName) {
  var source = fs.readFileSync(fileName, { encoding: 'utf8' });
  return recast.parse(source);
}

function processProgram(fileName, program) {
  var declarations = {};
  var references = {};

  recast.visit(program, {
    visitFunctionDeclaration: function(path) {
      declarations[path.node.id.name] = true;
      this.traverse(path);
    },
    visitVariableDeclaration: function(path) {
      path.node.declarations.forEach(function(decl) {
        declarations[decl.id.name] = true;
      });
      this.traverse(path);
    },
    visitIdentifier: function(path) {
      if (path.parentPath.node.type === 'MemberExpression' && path.name !== 'object') {
        this.traverse(path);
        return;
      }
      references[path.node.name] = true;
      this.traverse(path);
    },
  });

  Object.keys(declarations).forEach(function(decl) {
    if (references[decl]) {
      delete references[decl];
    }
  });

  return {
    declarations,
    references,
  };
}

var data = {};
var globalDeclarations = {};

files.forEach(function(file) {
  var ast = readAst(file);
  var fileName = path.basename(file);
  var fileData = processProgram(fileName, ast);
  data[fileName] = fileData;
  for (var decl in fileData.declarations) {
    if (!globalDeclarations[decl]) {
      globalDeclarations[decl] = [];
    }
    globalDeclarations[decl].push(fileName);
  }
});

console.log('var data = ' + JSON.stringify(data) + ';');
console.log('var globalDeclarations = ' + JSON.stringify(globalDeclarations) + ';');
