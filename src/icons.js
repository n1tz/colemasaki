import './icons.css';
const angles={'→':0,'↗':-45,'↑':-90,'↖':-135,'←':180,'↙':135,'↓':90,'↘':45};
export function arrow(direction='↓') {
  return `<svg class="ui-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" aria-hidden="true" focusable="false"><path d="M4 12h16M13 5l7 7-7 7" transform="rotate(${angles[direction]??0} 12 12)"/></svg>`;
}
// Labels remain plain text; only the UI arrow glyphs become real vector paths.
export function vectorizeArrows(root) {
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
  while(walker.nextNode())if(/[←↑→↓↖↗↘↙]/.test(walker.currentNode.data))nodes.push(walker.currentNode);
  for(const node of nodes){
    const fragment=document.createDocumentFragment();
    for(const part of node.data.split(/([←↑→↓↖↗↘↙])/)){
      if(part in angles){const template=document.createElement('template');template.innerHTML=arrow(part);fragment.append(template.content);}
      else fragment.append(document.createTextNode(part));
    }
    node.replaceWith(fragment);
  }
}
export function motionIcon(paused){return `<svg class="ui-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true" focusable="false">${paused?'<path d="m8 5 11 7-11 7Z"/>':'<path d="M8 5v14M16 5v14"/>'}</svg>`;}
