const fs = require('fs');
let c = fs.readFileSync('src/components/EventExplorer.tsx', 'utf8');
c = c.replace(/<div className="nx-desktop-controls" id="nx-control-summary">[\s\S]*?<\/div>/, '');
c = c.replace(/{!paused && <Joystick input={input} onFocus={focusWorld} \/>}/, '');
c = c.replace(/<div className="nx-touch-look">[\s\S]*?<\/div>/, '');
fs.writeFileSync('src/components/EventExplorer.tsx', c);
