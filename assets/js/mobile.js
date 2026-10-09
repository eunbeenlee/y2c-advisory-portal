/* Dock visibility changes only when a focused editor and reduced visual viewport coincide. */
(function(){
'use strict';
let pending=false;
function update(){
 pending=false;
 const vv=window.visualViewport,el=document.activeElement;
 const editing=!!el&&(/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)||el.isContentEditable);
 const keyboard=!!vv&&vv.scale===1&&window.innerWidth<=1023&&editing&&(window.innerHeight-vv.height-vv.offsetTop)>120;
 document.body.classList.toggle('mobile-keyboard-open',keyboard);
}
function schedule(){if(!pending){pending=true;requestAnimationFrame(update);}}
document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);
window.addEventListener('resize',schedule,{passive:true});window.addEventListener('orientationchange',schedule,{passive:true});
if(window.visualViewport){window.visualViewport.addEventListener('resize',schedule,{passive:true});window.visualViewport.addEventListener('scroll',schedule,{passive:true});}
schedule();
})();
