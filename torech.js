var baseOffset = 30;
var linkCount = {};
var keys = {};

function key(nodeA, nodeB) {
  var nameA = nodeA.name;
  var nameB = nodeB.name;

  if (keys[nameA] && keys[nameA][nameB]) {
    return keys[nameA][nameB];
  }
  if (keys[nameB] && keys[nameB][nameA]) {
    return keys[nameB][nameA];
  }
  if (!keys[nameA]) {
    keys[nameA] = {};
  }
  keys[nameA][nameB] = 'k-' + nameA + '--' + nameB;
  return keys[nameA][nameB];
}

var links = [];
var nodes = [];

var fileNodes = {};
var refNodes = {};

var shorten = false;

for (var file in data) {
  var fileName = file;
  if (shorten) {
    fileName = fileName.replace(/\.js$/, '');
  }

  var fileNode = {name: fileName, type: 'file', index: nodes.length};
  fileNodes[file] = fileNode;
  nodes.push(fileNode);
}

for (var file in data) {
  var fileNode = fileNodes[file];

  for (var ref in data[file].references) {
    var declarations = globalDeclarations[ref];
    if (!declarations || declarations.length > 1) {
      continue;
    }
    var target = fileNodes[declarations[0]];
    var k = key(fileNode, target);
    if (!linkCount[k]) {
      linkCount[k] = {
        count: 0,
        sourceName: fileNode.name
      };
    }
    links.push({
      source: fileNode,
      name: ref,
      flip: linkCount[k].sourceName !== fileNode.name,
      linkIndex: linkCount[k].count,
      target: target,
      key: k
    });
    linkCount[k].count += 1;
  }
}

var width = window.innerWidth * 2;
var height = window.innerHeight * 2;

function forceSides(alpha) {
  var tol = 55;
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    if (node.x < tol) {
      node.x = tol;
    }
    if (node.y < tol) {
      node.y = tol;
    }
    if (node.x > width - tol) {
      node.x = width - tol;
    }
    if (node.y > height - tol) {
      node.y = height - tol;
    }
  }
}

var force = d3.forceSimulation()
  .force('link', d3.forceLink().distance(500).id(function(d) { return d.name; }))
  .force('charge', d3.forceManyBody().strength(-2000))
  .force('center', d3.forceCenter(width / 2, height / 2));

var svg = d3.select('body').append('svg')
  .attr('width', width)
  .attr('height', height)
  .attr('xmlns:xlink', 'http://www.w3.org/1999/xlink');

force.nodes(nodes);

force.force('link')
  .links(links)

var link = svg.selectAll('.link')
  .data(links)
  .enter()
    .append('path')
    .attr('class', 'link');

var linkUses = svg.selectAll('.link')
  .data(links)
  .enter()
    .append('use')
    .attr('id', linkId);

var linkText = svg.selectAll('.link-text')
  .data(links)
  .enter().append('text')
    .attr('class', 'link-text')
    .append('textPath')
    .attr('xlink:href', function(d) { return '#' + linkId(d); })
    .attr('startOffset', '50%')
    .text(function(d) { return d.name; });



var node = svg.selectAll('.node')
  .data(nodes)
  .enter().append('circle')
    .attr('class', function(d) { return 'node ' + d.type; })
    .attr('r', function(d) { return d.type === 'file' ? 60 : 0; })

var text = svg.selectAll('.node-text')
  .data(nodes)
  .enter().append('text')
    .attr('class', 'node-text')
    .text(function(d) { return d.name; });

function linkPath(d) {
  var offsetX = (d.source.x + d.target.x) / 2;
  var offsetY = (d.source.y + d.target.y) / 2;
  var lcData = linkCount[d.key];
  var offset = d.linkIndex - (lcData.count - 1) / 2;
  if (d.flip) {
    offset *= -1;
  }
  var angle = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x);
  angle += Math.PI / 2;

  offsetX += Math.cos(angle) * baseOffset * offset;
  offsetY += Math.sin(angle) * baseOffset * offset;

  if (d.key === 'k-index--memory') {
    console.log(d, offset);
  }
  var path = [
    'M', d.source.x, d.source.y,
    'Q', offsetX, offsetY, d.target.x, d.target.y
  ];
  return path.join(' ');
}

function linkId(d) {
  return d.key + '-' + d.linkIndex;
}

force.on('tick', function() {
  link.attr('d', linkPath)
      .attr('id', linkId);

  node.attr('cx', function(d) { return d.x; })
    .attr('cy', function(d) { return d.y; });
  text.attr('x', function(d) { return d.x; })
    .attr('y', function(d) { return d.y; });
});
