/*
 Copyright (c) 2010 Brian Silverman, Barry Silverman

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

var frame, chipbg, overlay, hilite, hitbuffer, ctx;
var nodes = new Array();
var transistors = {};
var nodenamelist=[];

var ngnd = nodenames['vss'];
var npwr = nodenames['vcc'];

var chipLayoutIsVisible = true;  // only modified in expert mode

function setupNodes(){
	for(var i in segdefs){
		var seg = segdefs[i];
		var w = seg[0];
		if(nodes[w]==undefined) 
			nodes[w] = {segs: new Array(), num: w, pullup: seg[1]=='+',
			            state: false, float: true, gates: new Array(), c1c2s: new Array()};
		if(w==ngnd) continue;
		if(w==npwr) continue;
		nodes[w].segs.push(seg.slice(3));
	}
}

function setupTransistors(){
	for(i in transdefs){
		var tdef = transdefs[i];
		var name = tdef[0];
		var gate = tdef[1];
		var c1 = tdef[2];
		var c2 = tdef[3];
		var trans = {name: name, on: false, gate: gate, c1: c1, c2: c2};
		nodes[gate].gates.push(name);
		nodes[c1].c1c2s.push(name);
		nodes[c2].c1c2s.push(name);
		transistors[name] = trans;
	}
}

function setupLayerVisibility(){
	var x=document.getElementById('updateShow');
	for (var i=0;i<x.childNodes.length;i++) {
		if(x.childNodes[i].type='checkbox'){
			x.childNodes[i].checked=drawlayers[x.childNodes[i].name];
		}
	}
}

function setupBackground(){
	chipbg = document.getElementById('chipbg');
	chipbg.width = grCanvasSize;
	chipbg.height = grCanvasSize;
	var ctx = chipbg.getContext('2d');
	ctx.fillStyle = '#000000';
	ctx.strokeStyle = 'rgba(255,255,255,0.5)';
	ctx.lineWidth = grLineWidth;
	ctx.fillRect(0,0,grCanvasSize,grCanvasSize);
	for(var i in segdefs){
		var seg = segdefs[i];
		var c = seg[2];
		if (drawlayers[c]) {
			ctx.fillStyle = colors[c];
			drawSeg(ctx, segdefs[i].slice(3));
			ctx.fill();
			if((c==0)||(c==6)) ctx.stroke();
		}
	}		
}

function setupOverlay(){
	overlay = document.getElementById('overlay');
	overlay.width = grCanvasSize;
	overlay.height = grCanvasSize;
	ctx = overlay.getContext('2d');
}

function setupHilite(){
	hilite = document.getElementById('hilite');
	hilite.width = grCanvasSize;
	hilite.height = grCanvasSize;
	var ctx = hilite.getContext('2d');
}

function setupHitBuffer(){
	hitbuffer = document.getElementById('hitbuffer');
	hitbuffer.width = grCanvasSize;
	hitbuffer.height = grCanvasSize;
	hitbuffer.style.visibility = 'hidden';
	var ctx = hitbuffer.getContext('2d');
	for(i in nodes) hitBufferNode(ctx, i, nodes[i].segs);
}

function hitBufferNode(ctx, i, w){
	var low = hexdigit(i&0xf);
	var mid = hexdigit((i>>4)&0xf);
	var high = hexdigit((i>>8)&0xf);
	ctx.fillStyle = '#'+high+'F'+mid+'F'+low+'F';
	for(i in w) {
		drawSeg(ctx, w[i]);
		ctx.fill();
	}
}

function hexdigit(n){return '0123456789ABCDEF'.charAt(n);}


/////////////////////////
//
// Drawing Runtime
//
/////////////////////////

function refresh(){
	if(!chipLayoutIsVisible) return;
	ctx.clearRect(0,0,grCanvasSize,grCanvasSize);
	for(i in nodes){
		if(isNodeHigh(i)) overlayNode(nodes[i].segs);
	}
}

function overlayNode(w){
	ctx.fillStyle = 'rgba(255,0,64,0.4)';
	for(i in w) {
		drawSeg(ctx, w[i]);
		ctx.fill();
	}
}

function hiliteNode(n){
	var ctx = hilite.getContext('2d');
	ctx.clearRect(0,0,grCanvasSize,grCanvasSize);
	ctx.fillStyle = 'rgba(255,255,255,0.7)';
	if(n==-1) return;
	if(isNodeHigh(n[0]))
		ctx.fillStyle = 'rgba(255,0,0,0.7)';

	for(var i in n){
		var segs = nodes[n[i]].segs;
		for(var s in segs){drawSeg(ctx, segs[s]); ctx.fill();}
	}
}

function drawSeg(ctx, seg){
	var dx = 400;
	ctx.beginPath();
	ctx.moveTo(grScale(seg[0]+dx), grScale(grChipSize-seg[1]));
	for(var i=2;i<seg.length;i+=2) ctx.lineTo(grScale(seg[i]+dx), grScale(grChipSize-seg[i+1]));
	ctx.lineTo(grScale(seg[0]+dx), grScale(grChipSize-seg[1]));
}

function findNodeNumber(x,y){
	var ctx = hitbuffer.getContext('2d');
	var pixels = ctx.getImageData(x*grCanvasSize/600, y*grCanvasSize/600, 2, 2).data;
	if(pixels[0]==0) return -1;
	var high = pixels[0]>>4;
	var mid = pixels[1]>>4;
	var low = pixels[2]>>4;
	return (high<<8)+(mid<<4)+low;
}

function clearHighlight(){
	// remove red/white overlay according to logic value
	// for easier layout navigation
	ctx.clearRect(0,0,grCanvasSize,grCanvasSize);
}

function updateShow(layer, on){
	drawlayers[layer]=on;
	setupBackground();
}

// we draw the chip data scaled down to the canvas
// and so avoid scaling a large canvas
function grScale(x){
	return Math.round(x*grCanvasSize/grChipSize);
}

function localx(el, gx){
	return gx-el.getBoundingClientRect().left;
}

function localy(el, gy){
	return gy-el.getBoundingClientRect().top;
}

function setStatus(){
	var res = '';
	// pad the arguments to make this a three-line display
	// there must be a clean way to do this
	if(arguments[1]==undefined)arguments[1]="";
	if(arguments[2]==undefined)arguments[2]="";
	arguments.length=3;
	for(var i=0;i<arguments.length;i++) res=res+arguments[i]+'<br>';
	statbox.innerHTML = res;
}

function setupNodeNameList(){
	for(var i in nodenames)
		nodenamelist.push(i);
}

function nodeName(n) {
	for(var i in nodenames){
		if(nodenames[i]==n) return i;
	}
	return '';
}

function now(){return  new Date().getTime();}
