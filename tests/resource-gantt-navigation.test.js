const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const navigationHtml = read('Navigation.html');
const navigationJs = read('Navigation_js.html');
const codeJs = read('Code.js');

assert(
  navigationHtml.includes('id="EDS_ResourceGantt"'),
  'Navigation.html should add EDS_ResourceGantt button under task arrangement modal'
);

assert(
  navigationHtml.includes('任务规划') && navigationHtml.includes('Resource Gantt'),
  'Navigation.html should label the new entry as 任务规划 / Resource Gantt'
);

assert(
  navigationJs.includes("$('#EDS_ResourceGantt')") && navigationJs.includes('?v=EDS_ResourceGantt'),
  'Navigation_js.html should open the EDS_ResourceGantt route'
);

assert(
  codeJs.includes('Route.path("EDS_ResourceGantt", loadEDSResourceGantt)'),
  'Code.js should register the EDS_ResourceGantt route'
);

assert(
  codeJs.includes('function loadEDSResourceGantt'),
  'Code.js should define loadEDSResourceGantt'
);

assert(
  fs.existsSync(path.join(root, 'EDS_ResourceGantt.html')) &&
    fs.existsSync(path.join(root, 'EDS_ResourceGantt-js.html')),
  'Resource Gantt page HTML and JS files should exist'
);

console.log('resource gantt navigation checks passed');
