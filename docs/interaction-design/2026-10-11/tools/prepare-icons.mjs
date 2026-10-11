import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as lucide from 'lucide-react';
import {writeFileSync} from 'node:fs';
const names=['House','Dumbbell','Globe2','MessageCircle','Bell','ChevronRight','ChevronLeft','X','Settings','Crown','Plus','Minus','Check','Play','Pause','History','Send','Droplet','Flame','Bone','BicepsFlexed','Footprints','CalendarDays','RotateCcw','Search','CircleHelp','ArrowRight','Wifi','BatteryFull','Signal','ArrowUp','Square','StopCircle','Info'];
const icons={};
for(const name of names){if(!lucide[name])throw Error(name);icons[name]=renderToStaticMarkup(React.createElement(lucide[name],{size:24,strokeWidth:1.75,color:'#F4F6F3'}));}
writeFileSync(new URL('./icons.json',import.meta.url),JSON.stringify(icons,null,2)+'\n');
console.log(JSON.stringify({icons:names.length}));
