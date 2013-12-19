

var svgRoot;

var mousePanning = {
	"panning" : false,
	"startX" : 0,
	"startY" : 0
};
var DEFWIDTH=480;
var viewBox={
	x:0,
	y:0,
	w:DEFWIDTH,
	h:DEFWIDTH,
	z:1.0,
	zMax:10,
	zMin:0.1
};


var svgParent;

var viewWidth=10;
var viewHeight=10;

var CONTROLCOLUMNWIDTH=300;
function initSVG()
{


	svgParent=$('#svg')[0];
	var svg = svgParent.getElementsByTagName("svg")[0];
	
	svgRoot=svg;

    mousePanning.panning=false;
    mousePanning.startX=0;
    mousePanning.startY=0;
    viewBox.x=0;
    viewBox.y=0;
    viewBox.w=DEFWIDTH;
    viewBox.h=DEFWIDTH;
    viewBox.z=1;
	updateViewBox();
	svgRoot.setAttributeNS(null, "preserveAspectRatio", "xMidYMid meet");	
	
	$(svgParent).bind('mousedown', function(e){
        handleMouseDown(e);
    });
	$(svgParent).bind('mousemove', function(e){
        handleMouseMove(e);
    });
	
	$(svgParent).bind('mouseup', function(e){
        handleMouseUp(e);
    });
	
	$(svgParent).bind('mousewheel', function(e){
        handleMouseScroll(e);
    });
	$(svgParent).bind('mouseleave', function(e){
        handleMouseOut(e);
    });
	
	$(svgParent).width(window.innerWidth-CONTROLCOLUMNWIDTH);
	viewWidth=$('#svg').width();
	viewHeight=$('#svg').height();
	$( window ).resize(function() {
		updateSize();
	});
    updateSize();

    setTimeout(updateSize, 100 );//Strange behavior with panning/etc, dirty workaround
}
function findNode(query, callback)
{
	var lQuery=query.toLowerCase();
	var nodes=[];
	var selector = $(svgRoot).find("g[name]");
	var length=selector.length;
    var i = 0;
	selector.each(function( index ) {
		i+=1;
		var elem=$(this);
		var name= elem.attr('name');
		if(name.toLowerCase().indexOf(lQuery)!=-1)
		{
			var type= elem.attr('type');
			var text=$(elem.find('text')[0]);
			var transform =text.parent().attr('transform');			
			var posx=text.attr('x');
			var posy=text.attr('y');
			
			if(transform)
			{
				transform=transform.replace("matrix(","").replace(")","");
				var coord=transform.split(",");
				posx=coord[0]*posx+coord[2]*posy+coord[4]*1;
				posy=coord[1]*posx+coord[3]*posy+coord[5]*1;
				
			}
			
			nodes.push({name:name,type:type,x:posx,y:posy});
		}
		
		if(i == length) {
			if(typeof callback=="function")
			{
				callback(nodes);
			}
		}
	});
	
}
function changeNodeColor(hex)
{
	$(svgRoot).find("g").each(function( index ) {
		
		var elem=$(this);
		var style= elem.attr('style');
		if(style)
		{
			style=style.replace(/fill\:rgb\(\d{1,3},\d{1,3},\d{1,3}\)/,"fill:#"+hex);	
			style=style.replace(/fill\:\#\w{6}/,"fill:#"+hex);	//consider both rgb and hex notations		
			
			elem.attr("style",style);
		}
	});
}
function changeNodeLabelColor(hex)
{
	$(svgRoot).find("g text").each(function( index ) {
		
		var elem=$(this);
		var style= elem.attr('style');
		if(style)
		{
			style=style.replace(/fill\:rgb\(\d{1,3},\d{1,3},\d{1,3}\)/,"fill:#"+hex);	
			style=style.replace(/fill\:\#\w{6}/,"fill:#"+hex);	//consider both rgb and hex notations
			if(style.indexOf("fill:")<0)
				style+=		"fill:#"+hex;				
			elem.attr("style",style);
		}
	});
}
var tooltips=[];
//Tooltip styles
Opentip.styles.IStarML = {  
	fixed:true,
	stem: false,
	className: "IStarML",
	delay: 0.5,
	hideDelay: 0.1,
	removeElementsOnHide:true,
	containInViewport:true,
	showEffectDuration: 0.2,
	hideEffectDuration: 0.1,
	background:"#004382",
	borderWidth: 2,
	borderColor: "#ffffff",
	borderRadius: 20,
	shadow: true,
	shadowBlur: 15,
	shadowOffset:[5,5],
	shadowColor:"rgba(0,0,0,0.8)"
  
};
Opentip.defaultStyle = "IStarML";
//Create Tooltips (extract information from nodes)
function registerTooltips()
{
	tooltips=[];
	$(svgRoot).find("g[name]").each(function( index ) 
	{
		var elem=$(this);
		var name=elem.attr("name");
		var type=elem.attr("type");
		var comment=elem.attr("comment");
		if(!type)
			type="";
		if(!comment)
			comment="";
			
		if(comment!="")//only if comments exist
		{		 
			var tooltip = new Opentip(elem, comment, type);
			tooltips.push(tooltip);
		}
	});
	
}

var svgControlRoot;
var svgButtonNormalColor="006bf8";
var svgButtonPressedColor="003c8e";
var buttonIntervals={
	leftButtonInterval:0,
	rightButtonInterval:0,
	downButtonInterval:0,
	upButtonInterval:0,
	zoomInButtonInterval:0,
	zoomOutButtonInterval:0

};

var BUTTONPANSPEED=20;
var BUTTONPANINTERVAL=30;
var BUTTONZOOMSPEED=0.1;
var BUTTONZOOMINTERVAL=30;

var zoomSlider;
var zoomTop=420;
var zoomBottom=670;
var ZOOMMAPPINGA=0.998333;
var ZOOMMAPPINGB=0.214976;
function initControls()
{
	
	
	var svg = $('#svgControlElements svg')[0];
	
	svgControlRoot=svg;
	svgControlRoot.setAttributeNS(null, "viewBox", "0 0 283 833");
	svgControlRoot.setAttributeNS(null, "preserveAspectRatio", "xMidYMid meet");	
	
	var leftButton=$(svgControlRoot).find("#panLeft");
	var downButton=$(svgControlRoot).find("#panDown");
	var rightButton=$(svgControlRoot).find("#panRight");
	var upButton=$(svgControlRoot).find("#panUp");
	var zoomInButton=$(svgControlRoot).find("#zoomIn");
	var zoomOutButton=$(svgControlRoot).find("#zoomOut");
	var centerButton=$(svgControlRoot).find("#centerView");
	var sliderHeight=$('#zoomSlider').attr('height')/2;
	zoomSlider=$(svgControlRoot).find("#zoomSlider");
	
	updateZoomSlider();
	zoomSliderPressed=false;
	zoomSlider.bind('mousedown', function(e){        		
		zoomSliderPressed=true;
		repleaceSVGFillColor(zoomSlider,svgButtonPressedColor);	
		
    });
	
	var pt = svgControlRoot.createSVGPoint();
	$(svgControlRoot.parentNode).bind('mousemove', function(e){        		
		
		if(zoomSliderPressed)
		{
			pt.x = e.clientX; pt.y = e.clientY;
			var loc= pt.matrixTransform(svgControlRoot.getScreenCTM().inverse());
			//Clamp
			loc.y=loc.y.clamp(zoomTop+sliderHeight,zoomBottom+sliderHeight);
			//adjust do slider height
			loc.y-=sliderHeight;
			zoomSlider.attr("y",loc.y);
			
		
			var zf=(loc.y-zoomTop)/(zoomBottom-zoomTop);
			zf=Math.pow(Math.E,((zf-ZOOMMAPPINGA)/ZOOMMAPPINGB));
			zf=zf.clamp(0,1);
			var zm= zf*(viewBox.zMax-viewBox.zMin);
			zoom(zm,true);
			
		}
		
		
		
		
		
    });
	$(svgControlRoot.parentNode).bind('mouseleave', function(e){
		zoomSliderPressed=false;
		repleaceSVGFillColor(zoomSlider,svgButtonNormalColor);			
	});
	zoomSlider.bind('mouseup', function(e){
		zoomSliderPressed=false;
		repleaceSVGFillColor(zoomSlider,svgButtonNormalColor);		
    });
	
	centerButton.bind('mousedown', function(e){       
		repleaceSVGFillColor(centerButton.find(".svgElemBack"),svgButtonPressedColor);	
		viewBox.x=0;
		viewBox.y=0;
		viewBox.w=DEFWIDTH;
		viewBox.h=viewBox.w;
		viewBox.z=1;
		updateViewBox();
		updateZoomSlider();
			
    });
	
	centerButton.bind('mouseup mouseleave', function(e){   
		repleaceSVGFillColor(centerButton.find(".svgElemBack"),svgButtonNormalColor);
	});
	
	zoomInButton.bind('mousedown', function(e){
        clearInterval(buttonIntervals.zoomInButtonInterval);
		buttonIntervals.zoomInButtonInterval = setInterval(function(){ zoom(1+(BUTTONZOOMSPEED),false);}, BUTTONZOOMINTERVAL);
		repleaceSVGFillColor(zoomInButton.find(".svgElemBack"),svgButtonPressedColor);		
    });
	zoomInButton.bind('mouseup mouseleave', function(e){
		clearInterval(buttonIntervals.zoomInButtonInterval);
		repleaceSVGFillColor(zoomInButton.find(".svgElemBack"),svgButtonNormalColor);		
    });
	zoomOutButton.bind('mousedown', function(e){
        clearInterval(buttonIntervals.zoomOutButtonInterval);
		buttonIntervals.zoomOutButtonInterval = setInterval(function(){ zoom(1-(BUTTONZOOMSPEED),false);}, BUTTONZOOMINTERVAL);
		repleaceSVGFillColor(zoomOutButton.find(".svgElemBack"),svgButtonPressedColor);		
    });
	zoomOutButton.bind('mouseup mouseleave', function(e){
		clearInterval(buttonIntervals.zoomOutButtonInterval);
		repleaceSVGFillColor(zoomOutButton.find(".svgElemBack"),svgButtonNormalColor);		
    });
	
	leftButton.bind('mousedown', function(e){
        clearInterval(buttonIntervals.leftButtonInterval);
		buttonIntervals.leftButtonInterval = setInterval(function(){pan(BUTTONPANSPEED,0);}, BUTTONPANINTERVAL);
		repleaceSVGFillColor(leftButton.find(".svgElemBack"),svgButtonPressedColor);		
    });
	leftButton.bind('mouseup mouseleave', function(e){
		clearInterval(buttonIntervals.leftButtonInterval);
		repleaceSVGFillColor(leftButton.find(".svgElemBack"),svgButtonNormalColor);		
    });
	rightButton.bind('mousedown', function(e){
        clearInterval(buttonIntervals.rightButtonInterval);
		buttonIntervals.rightButtonInterval = setInterval(function(){ pan(-BUTTONPANSPEED,0);}, BUTTONPANINTERVAL);
		repleaceSVGFillColor(rightButton.find(".svgElemBack"),svgButtonPressedColor);		
    });
	rightButton.bind('mouseup mouseleave', function(e){
		clearInterval(buttonIntervals.rightButtonInterval);
		repleaceSVGFillColor(rightButton.find(".svgElemBack"),svgButtonNormalColor);		
    });
	
	upButton.bind('mousedown', function(e){
        clearInterval(buttonIntervals.upButtonInterval);
		buttonIntervals.upButtonInterval = setInterval(function(){ pan(0,BUTTONPANSPEED);}, BUTTONPANINTERVAL);
		repleaceSVGFillColor(upButton.find(".svgElemBack"),svgButtonPressedColor);		
    });
	upButton.bind('mouseup mouseleave', function(e){
		clearInterval(buttonIntervals.upButtonInterval);
		repleaceSVGFillColor(upButton.find(".svgElemBack"),svgButtonNormalColor);		
    });
	downButton.bind('mousedown', function(e){
        clearInterval(buttonIntervals.downButtonInterval);
		buttonIntervals.downButtonInterval = setInterval(function(){ pan(0,-BUTTONPANSPEED);}, BUTTONPANINTERVAL);
		repleaceSVGFillColor(downButton.find(".svgElemBack"),svgButtonPressedColor);		
    });
	downButton.bind('mouseup mouseleave', function(e){
		clearInterval(buttonIntervals.downButtonInterval);
		repleaceSVGFillColor(downButton.find(".svgElemBack"),svgButtonNormalColor);		
    });
	
	
}

//adjust svg size when window is resized
function updateSize()
{
	try
    {
        $(svgParent).width($("#view").width());
        viewWidth=$('#svg').width();
        viewHeight=$('#svg').height();
        updateViewBox();
    }
    catch(e)
    {

    }
}
//updates zoom slider position
function updateZoomSlider()
{
	var zf=viewBox.z/(viewBox.zMax-viewBox.zMin);
	zf=zf.clamp(0,1);
	//'linear' maping (so the slider changes linearly)	
	zf=ZOOMMAPPINGB*Math.log(zf)+ZOOMMAPPINGA;
	var zoomSliderPos=zoomTop+((zoomBottom-zoomTop)*zf);
	zoomSlider.attr("y",zoomSliderPos);
	
}
//replaces the fill-color of an svg element (elem must be jquery object)
function repleaceSVGFillColor(elem,color)
{
	var style=elem.attr('style');
	style=style.replace(/fill\:\#\w{6}/,"fill:#"+color);
	elem.attr("style",style);
}
//adjusts viewbox (vor panning/zooming
function updateViewBox()
{
	svgRoot.setAttributeNS(null, "viewBox", viewBox.x+" "+viewBox.y+" "+viewBox.w+" "+viewBox.h);
}
function moveTo(x,y)
{	
	viewBox.y=y-viewBox.w/2;
	viewBox.x=x-viewBox.h/2;
	updateViewBox();
}
//pans the view
function pan(dx, dy)
{
	var scale=(viewBox.h/viewHeight);
	if(viewBox.w/viewWidth>scale)
		scale=(viewBox.w/viewWidth);


    if(dx<0 && viewBox.x<viewBox.w)
        viewBox.x-=dx*scale;
    if(dx>0 && -viewBox.x<viewBox.w)
        viewBox.x-=dx*scale;


    if((dy<0 && viewBox.y<viewBox.h)||(dy>0 && -viewBox.y<viewBox.h))
	    viewBox.y-=dy*scale;
	
	
	updateViewBox();
	
	
}

function handleMouseOut(evt){
	//mousePanning.state = "idle";
}
function handleMouseDown(evt) {
	/*if(evt.preventDefault)
		evt.preventDefault();
	
	evt.returnValue = false;*/
	
	if(!mousePanning.panning)
	{
		mousePanning.panning = true;
		mousePanning.startX = evt.clientX;
		mousePanning.startY = evt.clientY;	
	}
}

function handleMouseUp(evt) {
	/*if(evt.preventDefault)
		evt.preventDefault();

	evt.returnValue = false;*/
	
	mousePanning.panning = false
}

function handleMouseMove(evt) {
	/*if(evt.preventDefault)
		evt.preventDefault();

	evt.returnValue = false;*/
	/*var pt = svgRoot.createSVGPoint();  // Created once for document

		
			pt.x = evt.clientX;
			pt.y = evt.clientY;

			// The cursor point, translated into svg coordinates
			var cursorpt =  pt.matrixTransform(svgRoot.getScreenCTM().inverse());
			$('#logoutButton').val(cursorpt.x+" "+viewBox.w);
			$('#loadButton').val(cursorpt.y+" "+viewBox.h);*/
			
	if(mousePanning.panning) {
		
		pan(evt.clientX - mousePanning.startX, evt.clientY - mousePanning.startY);
		mousePanning.startX = evt.clientX;
		mousePanning.startY = evt.clientY;
	}
}

function handleMouseScroll(evt) {
	
	if(evt.preventDefault)
		evt.preventDefault();
	
	evt.returnValue = false;
	delta = evt.originalEvent.wheelDelta /3600; // Mozilla
	
	zoom(1+(delta*10),false);
	
}
Number.prototype.clamp = function(min, max) {
  return Math.max(Math.min(this, max), min);
};
//isZ=true if zoomfactor is passed directly instead only change
function zoom(scale,isZ)
{
	if(!isZ)
	{
		scale=scale.clamp(0.10,10);	
		viewBox.z/=scale;		
	}	
	var oldw=viewBox.w;
	var oldh=viewBox.h;	
	if(isZ)
	{
		viewBox.z=scale;
		
	}
	viewBox.z=viewBox.z.clamp(viewBox.zMin,viewBox.zMax);
	viewBox.w=DEFWIDTH*viewBox.z;	
	viewBox.h=viewBox.w;	
	
	
	viewBox.x-=(viewBox.w-oldw)/2;
	viewBox.y-=(viewBox.h-oldh)/2;	
	
	updateViewBox();
	if(!isZ)
	{
		updateZoomSlider();
	}
}