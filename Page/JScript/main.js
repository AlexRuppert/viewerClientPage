var isViewMaximized=false;
var PROTOCOL="https";
var MODEL_SERVICE_ADDRESS="localhost:9092";//"137.226.143.67:9092";
var VISUALIZER_SERVICE_ADDRESS="localhost:9092";//"137.226.143.67:9091";
var MODEL_SERVICE_NAME="i5.las2peer.services.iStarMLModelService.IStarMLModelService";
var VISUALIZER_SERVICE_NAME="i5.las2peer.services.iStarMLVisualizerService.IStarMLVisualizerService";
var _GET="get";
var _PUT="put";
var _POST="post";
var _DELETE="DELETE";

$(document).ready(function () 
{
    initPaths();
});
/**
 * Creates the URL basis to address the service
 * @param protocol https or http
 * @param address host and port of server
 * @param service classname of service to use
 * @returns {string}
 */
function buildURLBase(protocol,address,service)
{
    return protocol+"://"+address+"/"+service;
}
/**
 * Creates base URL to address Model Service
 * @returns {string}
 */
function buildModelURLBase()
{
    return buildURLBase(PROTOCOL,MODEL_SERVICE_ADDRESS,MODEL_SERVICE_NAME);
}
/**
 * Creates base URL to address Visualizer Service
 * @returns {string}
 */
function buildVisualizerURLBase()
{
    return buildURLBase(PROTOCOL,VISUALIZER_SERVICE_ADDRESS,VISUALIZER_SERVICE_NAME);
}
var visURL="";
var modelURL="";
/**
 * Sets all GUI elements in the mode, where the user can perform a login
 */
function presentLogin()
{
	$("#controlsInner").hide();
	$("#view").hide();
	$("#welcomeScreen").show();
	$("#loginContainer").show();

    $('#selectModelScreen').hide();
	$("#loginName").val("User A");
	$("#loginPassword").val("userAPass");
	$("#loginName").focus();
    clearSearchResults();
}
var authData;
/**
 * Stores login data internally to send it witch each request
 * @param name
 * @param pass
 */
function login(name, pass)
{
	//alert(name+" "+pass);
    authData=B64.encode(name + ":" + pass);

	checkLogin(modelURL,function(){
        checkLogin(visURL,function(){
            $("#loginInfo").text("Logged in as "+ name);
            $("#welcomeScreen").hide();
            $("#loginContainer").hide();
            $("#controlsInner").show();
            //$("#view").show();
            //$("#searchField").focus();



               //alert(data);



        });
    });
}
/**
 * Sends a simple request to the service to check if the login data is valid
 * @param url
 * @param callback mathod to call after a server response was received
 */
function checkLogin(url,callback)
{
    $.ajax({
        url: url,
        dataType : "text",
        type: _GET,
        crossDomain:true,
        beforeSend: function(xhr) { xhr.setRequestHeader("Authentication", "Basic " +authData);},
        complete: function(xhr,status) {
           if(xhr.status==401)
           {
               alert("Not authorized for "+url);
           }
           else if(xhr.status==200)
           {

               if (callback && typeof(callback) === "function") {
                   callback();
               }
           }
           else
           {
               alert("Internal error for "+url);
           }
        }
    });
}
/**
 * Deletes the stored login data and resets the GUI
 */
function logout()
{
    authData=null;
    $('#svg').empty();
	presentLogin();	
}
/**
 * Clears the area for local search results
 */
function clearSearchResults()
{
	$("#resultBox").empty();
}

/**
 * Shows the Model Browser, where models can be opened
 */
function showModelBrowser()
{
    $('#view').hide();
    $('#selectModelScreen').show();
    $('#searchDatabaseField').focus();
}
/**
 * Hides the Model Browser
 */
function hideModelBrowser()
{
    $('#selectModelScreen').hide();
    $('#view').show();
}
var currentCollection="Collection";
/**
 * Replaces all / with . to create a valid URI collection path
 * @param collection path to convert
 * @returns {string}
 */
function convertToRequestCollection(collection){
    return collection.replace(/\//g,".");
}
/**
 * Retrieves the contents of a collection and displays them in the Model Browser
 * @param collection path
 */
function browseCollection(collection)
{

    sendModelRequest(_GET,convertToRequestCollection(collection),"",function(data){
        xml = $.parseXML( data );
        listBrowseCollections(xml);
        listBrowseResources(xml);

    });
}
var BASE_MODEL_ITEM=
"<div class='iconArea'>\
</div>\
<div class='textArea'>\
</div>\
<div class='infoArea'>\
</div>\
<input class='historyArea' type='button'>\
</input>";
/**
 * Lists collections in the Model Browser based on the collections in the xml
 * @param xml response from the service
 */
function listBrowseCollections(xml)
{
    var selector = $(xml).find("Collection");
    var modelItems=$('#modelItems');
    modelItems.empty();
    selector.each(function( index ) {
        var elem=$(this);
        var e = $(document.createElement('div') );
        e.addClass("modelItem collection");
        e.html(BASE_MODEL_ITEM);
        e.find(".textArea").html(elem.attr("name"));
        e.find(".infoArea").html(elem.attr("owner"));
        e.attr("name",elem.attr("name"));

        e.click(function(evt){
            appendCurrentCollectionPath($(this).attr("name"));
        });
        modelItems.append(e);
    });
}
/**
 * Lists resources in the Model Browser based on the collections in the xml
 * @param xml server response
 */
function listBrowseResources(xml)
{
    var selector = $(xml).find("Resource");
    var modelItems=$('#modelItems');
    selector.each(function( index ) {
        var elem=$(this);
        var e = $(document.createElement('div') );
        e.addClass("modelItem");
        e.html(BASE_MODEL_ITEM);
        e.find(".textArea").html(elem.attr("name"));
        e.find(".infoArea").html(elem.attr("lastModified"));

        e.attr("name",elem.attr("name"));

        var historyButton=e.find(".historyArea");


        if(elem.attr("path"))
        {
            var path=elem.attr("path");
            e.attr("path",path);
            historyButton.attr("path",path);
        }
        else
        {
            e.attr("path",currentCollection);
            historyButton.attr("path",currentCollection);
        }

        e.click(function(evt){
           loadModel($(this).attr("path"),$(this).attr("name"));
        });

        historyButton.attr("name",elem.attr("name"));



        historyButton.attr("isOpened",false);

        historyButton.click(function(evt){
            evt.stopPropagation();

            if($(this).attr("isOpened")=="false")
            {
                $(this).attr("isOpened",true);
                getRevisions($(this).attr("path"),$(this).attr("name"));
            }
            else
            {
                $(this).attr("isOpened",false);
                $('#modelItems .history[resname='+$(this).attr("name")+']').remove();
            }


        });
        modelItems.append(e);
    });
}
/**
 * Lists all previous versions of a resource in the Model Browser based on the data in the xml
 * @param collection collection path of the resource
 * @param xml server response
 */
function listBrowseRevisions(collection,xml)
{
    var selector = $(xml).find("Version");
    var modelItems=$('#modelItems');
    var elemCounter=0;
    selector.each(function( index ) {
        elemCounter+=1;
        var elem=$(this);
        var e = $(document.createElement('div') );
        e.addClass("modelItem history");
        e.html(BASE_MODEL_ITEM);
        e.find(".textArea").html(elem.attr("revision"));
        e.find(".infoArea").html(elem.attr("date")+ "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; by "+elem.attr("user"));

        e.attr("resname",elem.attr("name"));
        e.attr("revision",elem.attr("revision"));
        e.attr("path",collection);
        e.click(function(evt){
            loadRevisionModel($(this).attr("path"),$(this).attr("resname"),$(this).attr("revision"));
        });

        modelItems.find(".modelItem[name="+elem.attr("name")+"]").after(e);
    });
    if(elemCounter==0)
    {

    }
}
/**
 * Retrieves information about previous versions from the server and displays them
 * @param collection
 * @param resource
 */
function getRevisions(collection,resource)
{

    sendModelRequest(_GET,convertToRequestCollection(collection)+"/"+resource+"/"+"versions","",function(data){
        xml = $.parseXML( data );
        listBrowseRevisions(collection,xml);

    });
}
/**
 * Updates the displayed collection path in the header of the Model Browser
 */
function updateCurrentCollectionPath()
{
    $('#selectModelScreen .textArea').html(currentCollection);
}
/**
 * Modifies the current collection path
 * @param path sub collection to navigate to
 */
function appendCurrentCollectionPath(path)
{
    if(currentCollection.length>0&&path.length>0)
        currentCollection+="/"+path;
    else
        currentCollection+=path;
    $('#modelItems').empty();
    updateCurrentCollectionPath();
    browseCollection(currentCollection);
}
/**
 * Moves to the parent collection in the current collection path
 */
function moveUpCurrentCollectionPath()
{
    var last=currentCollection.lastIndexOf("/");
    if(last>0)
    {
        currentCollection=currentCollection.substring(0,last);
        browseCollection(currentCollection);
        updateCurrentCollectionPath();
    }

}
/**
 * Starts the Model Browser
 */
function startBrowseCollection()
{

    //currentCollection="";
    $('#modelItems').empty();
    appendCurrentCollectionPath("");
    showModelBrowser();

}

var lastSearchQuery="";
/**
 * Searches the current collection for a model or element
 * @param query text that a name must contain
 * @param type model/actor/agent/role/position/goal/task/softgoal/resource
 */
function searchDataBase(query,type)
{
    lastSearchQuery=query;
    sendModelRequest(_GET,convertToRequestCollection(currentCollection)+"?search="+escape(query)+"&searchType="+type,"",function(data){
        xml = $.parseXML( data );
        listBrowseResources(xml);

    });
}
/**
 * Sends a request to the given URL and invokes the callback method with the server response as a parameter
 * @param baseURL address of the service
 * @param method HTTP method
 * @param URI
 * @param content if POST is used, the content of the HTTP body
 * @param callback method to invoke after service has responded
 */
function sendRequest(baseURL,method,URI,content,callback)
{
    $.ajax({
        url: encodeURI(baseURL+"/"+URI),
        dataType : "text",
        type: method.toLowerCase(),
        data:content,
        contentType: "text/plain; charset=UTF-8",
        crossDomain:true,
        beforeSend: function(xhr) { xhr.setRequestHeader("Authentication", "Basic " +authData);},
        complete: function (xhr, status) {
            if (xhr.status == 401) {
                alert("Not authorized for " + url);
            }
            else if (xhr.status != 200) {
                alert(xhr.status + " : Internal error for " + encodeURI(baseURL + "/" + URI));
            }
        }
    }).done(function( data ) {

            if(data&&data.indexOf("Error")==0)//Display Errors
            {
                alert(data);
            }
            if (callback && typeof(callback) === "function") {
                callback(data);
            }
    });
}
/**
 * Sends a request to the Model Service
 * @param method HTTP method
 * @param URI
 * @param content if POST is used, the content of the HTTP body
 * @param callback method to invoke after service has responded
 */
function sendModelRequest(method,URI,content,callback)
{
    sendRequest(modelURL,method,URI,content,callback);
}
/**
 * Sends a request to the Visualizer Service
 * @param method HTTP method
 * @param URI
 * @param content if POST is used, the content of the HTTP body
 * @param callback method to invoke after service has responded
 */
function sendVisualizerRequest(method,URI,content,callback)
{
    sendRequest(visURL,method,URI,content,callback);
}
/**
 * Requests a database registration for the current user
 * An optional user message can be sent
 */
function sendRegistration()
{
    var mailContent=$('#mailContent').val();
    sendModelRequest(_POST,"setting/register/DB",mailContent);
}
var legendVisible=false;

/**
 * Registers all events for the user interface control elements
 */
function registerEvents()
{
    $('#registerForDB').click(function(){
        showRegisterDBScreen();
    });
    $('#closeRegisterScreen').click(function(){

        closeRegisterDBScreen();
    });
    $('#sendMail').click(function(){
        sendRegistration();
        closeRegisterDBScreen();
    });
	$("#loginButton").click(function(){
		login($("#loginName").val(),$("#loginPassword").val());
	});
	
	$("#loginPassword").keypress(function(e) {
		if(e.which == 13) {
			$("#loginButton").click();
		}
	});
	$("#logoutButton").click(function(){
		logout();
	});
    $("#reloadButton").click(function(){
        reloadModel();
    });
    $("#moveToParentCollection").click(function(){
        moveUpCurrentCollectionPath();
    });
    $("#closeModelScreenButton").click(function(){
        hideModelBrowser();
        if(!modelLoaded)
        {
            $('#view').hide();
        }
    });
    $('#helpButton').click(function(){

      if(legendVisible)
      {
        $('#legend').hide();
        legendVisible=false;
      }
       else
      {
        $('#legend').show();
        legendVisible=true;
      }
    });
	$('#loadButton').click(function(){

        lastSearchQuery="";
        clearSearchResults();
        startBrowseCollection();
	});
    $('#loadOwnButton').click(function(){
        $("#uploadXML").click();
    });


    $('#downloadCurrentModelButton').click(function(){
        var svgString=$('#svg').html();

        if(svgString&&svgString.trim().length>1)
        {
            window.open('data:image/svg+xml;base64,' +
                B64.encode(svgString));
        }

    });

    $('#uploadXML').bind('change',function(evt){
        clearSearchResults();
        var f = evt.target.files[0];

        var r = new FileReader();

        r.onload = function(e) {
            var contents = e.target.result;
            contents=contents.replace(/(\r\n)/gm," ");
            $('#modelTitle').html("Local: "+ f.name);
            requestVisualization(contents);
        }
        r.readAsText(f,'UTF-8');

    });
    $("#searchDatabaseButton").click(function(){

        var text=$("#searchDatabaseField").val();
        var type="model";

        if(text && text.length>1)
        {
            if($('#selectSearch').val()!=type)
            {
                type=$('#selectType').val();
            }
            $('#modelItems').empty();
            searchDataBase(text,type);
        }
    });
    $("#searchDatabaseField").keypress(function(e) {
        if(e.which == 13) {
            $("#searchDatabaseButton").click();
        }
    });

	$("#searchButton").click(function(){
		clearSearchResults();
		var text=$("#searchField").val();
		if(text && text.length>1)
		{
			findNode(text, function(nodes){//searches the svg for a node
				resultBox=$("#resultBox");
				for(var i=0;i<nodes.length;i++)
				{
					var node=nodes[i];
					var elem=document.createElement("div");
					elem.className="searchResult";
					elem.innerHTML="<span style='font-size:12px; font-weight:200'>"+node.type+"  </span>"+node.name;
					elem.x=node.x;
					elem.y=node.y;
					$(elem).click(function (e)
					{

						var x=this.x;
						var y=this.y;
						moveTo(x,y);
					});
					resultBox.append(elem);
				}
				if(nodes.length>0)
				{
					moveTo(nodes[0].x,nodes[0].y);
				}
			});
		}
	});
	$("#searchField").keypress(function(e) {
		if(e.which == 13) {
			$("#searchButton").click();
		}
	});


    $("#selectSearch").change(function() {
        var selected= $(this).val();
        switch(selected)
        {
            case 'model':
                hideSecondSelectBox();
                break;
            case 'actor type':
                createSearchTypesActor();
                showSecondSelectBox();
                break;
            case 'ielement type':
                createSearchTypesIElement();
                showSecondSelectBox();
                break;
        }
    });

}
var modelLoaded=false;
/**
 * Loads a version of a model and displays it
 * @param collection
 * @param resource
 * @param revision
 */
function loadRevisionModel(collection,resource,revision)
{
    var requestString=convertToRequestCollection(collection)+"/"+resource+"/"+"versions"+"/"+revision;
    requestModel(requestString);
    $('#modelTitle').html("Revision: "+revision+" of "+resource);
}
var oldModelRequest="";
/**
 * Loads a model and displays it
 * @param collection
 * @param resource
 */
function loadModel(collection, resource)
{

    var requestString=convertToRequestCollection(collection)+"/"+resource;
    oldModelRequest=requestString;
    requestModel(requestString);
    $('#modelTitle').html("Model: "+resource);
}
/**
 * Updates the visualization of the currently loaded model
 */
function reloadModel()
{
    if(oldModelRequest.trim()!="")
        requestModel(oldModelRequest);
}
/**
 * Requests a model from the database and sends it to the Visualization Service to get a SVG
 * @param requestString specifies which model to load (collection, resource, version)
 */
function requestModel(requestString)
{


    sendModelRequest(_GET,requestString,"",function(model){
        //alert(model);
        requestVisualization(model);
    });
}
/**
 * Requests a SVG from the Visualizer Service based on a given model
 * @param model model zu visualize
 */
function requestVisualization(model)
{
    //console.log(model+"\n\n---");
    var nodeColor=hexToRgb('#'+lastNodeColor);
    var labelColor=hexToRgb('#'+lastLabelColor);

    var colorString="";
    if(nodeColor!=null&&labelColor!=null)//set node and nodelabel colors that the Visualizer Service should use
    {
        colorString+="?nr="+nodeColor.r+"&ng="+nodeColor.g+"&nb="+nodeColor.b;
        colorString+="&lr="+labelColor.r+"&lg="+labelColor.g+"&lb="+labelColor.b;

    }

    sendVisualizerRequest("post",colorString,model,function(data){

        $('#svg').html(data);
        initSVG(); //init svg controls etc.

        registerTooltips(); //loads comments from the SVG to display as tooltips
        hideModelBrowser();

        if(lastSearchQuery!="")
        {
            $('#searchField').focus();
            $('#searchField').val(lastSearchQuery);
            $('#searchButton').click();
            lastSearchQuery="";
        }
       //    $('#searchField').focus();
        modelLoaded=true;

    });
}
var ANIMSPEED=300;
/**
 * Animation if control panel is toggled
 */
function setAnimation()
{

	$('#maximizeButton').click(function(e)
	{
		if(isViewMaximized)
		{
			
			$("#controls").animate({				
				left: "+=300"
            }, ANIMSPEED, function() {
				// Animation complete.
			  });
			$("#viewContainer").animate({				
				marginLeft: "+=300"
			  }, ANIMSPEED, function() {
				// Animation complete.
				updateSize();
			  }); 
			
			$('#maximizeButton').css('background-image','url("img/maximizeButton.png")');
			
		}
		else
		{
			//$('#controls').css('display','none');
			//$('#viewContainer').css('margin-left','0px');
			$('#maximizeButton').css('background-image','url("img/minimizeButton.png")');
			
			$("#controls").animate({				
				left: "-=300"
			  }, ANIMSPEED, function() {
				// Animation complete.
			  });
			$("#viewContainer").animate({				
				marginLeft: "-=300"
			  }, ANIMSPEED, function() {
				// Animation complete.
				updateSize();
			  }); 
		}
		isViewMaximized=!isViewMaximized;
	});
}
var lastNodeColor="0049c7";
var lastLabelColor="ffffff";


/**
 * Converts hex to RGB format, snippet taken from
 * //http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
 * @param hex
 * @returns {{r: Number, g: Number, b: Number}}
 */
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}
/**
 * Initializes the colorpicker
 */
function setColorPicker()
{
	$('#colorSelectorNode div').css('backgroundColor', '#' + lastNodeColor);
	$('#colorSelectorNode').ColorPicker({
		color: '#'+lastNodeColor,
		onShow: function (colpkr) {
			$(colpkr).fadeIn(500);
			return false;
		},
		onHide: function (colpkr) {
			
			changeNodeColor(lastNodeColor);
			$(colpkr).fadeOut(500);
			return false;
		},
		onChange: function (hsb, hex, rgb) {
			$('#colorSelectorNode div').css('backgroundColor', '#' + hex);
			lastNodeColor=hex;
            localStorage.lastNodeColor=hex;
		}
	});
	changeNodeLabelColor(lastLabelColor);
	$('#colorSelectorLabel div').css('backgroundColor', '#' + lastLabelColor);
	$('#colorSelectorLabel').ColorPicker({
		color: '#'+lastLabelColor,
		onShow: function (colpkr) {
			$(colpkr).fadeIn(500);
			return false;
		},
		onHide: function (colpkr) {
			
			changeNodeLabelColor(lastLabelColor);
			$(colpkr).fadeOut(500);
			return false;
		},
		onChange: function (hsb, hex, rgb) {
			$('#colorSelectorLabel div').css('backgroundColor', '#' + hex);
			lastLabelColor=hex;
            localStorage.lastLabelColor=hex;
		}
	});
}
var firstLocalSearchFieldFocus=false;
/**
 * Inits the local search field
 * Displays some hint about it
 */
function initLocalSearchField()
{
    $('#searchField').val("Search current Model");
    $('#searchField').css("color","grey");
    $('#searchField').focus(function(){
        if(!firstLocalSearchFieldFocus)
        {
            firstLocalSearchFieldFocus=true;
            $('#searchField').val("");
            $('#searchField').css("color","black");
        }
    });

}
/**
 * Inits the dropdowns to choose the search type
 */
function initSearchTypes()
{
    var newOption = $(document.createElement("option"));
    newOption.html("model");
    $('#selectSearch').append(newOption);
    newOption = $(document.createElement("option"));
    newOption.html("actor type");
    $('#selectSearch').append(newOption);
    newOption = $(document.createElement("option"));
    newOption.html("ielement type");
    $('#selectSearch').append(newOption);
    hideSecondSelectBox();


}
/**
 * Inits the dropdowns to choose the search type
 */
function createSearchTypesIElement()
{
    $('#selectType').empty();
    var newOption = $(document.createElement("option"));
    newOption.html("resource");
    $('#selectType').append(newOption);
    newOption = $(document.createElement("option"));
    newOption.html("task");
    $('#selectType').append(newOption);
    newOption = $(document.createElement("option"));
    newOption.html("goal");
    $('#selectType').append(newOption);
    newOption = $(document.createElement("option"));
    newOption.html("softgoal");
    $('#selectType').append(newOption);
    newOption = $(document.createElement("option"));
    newOption.html("belief");
    $('#selectType').append(newOption);

}
/**
 * Inits the dropdowns to choose the search type
 */
function createSearchTypesActor()
{
    $('#selectType').empty();
    var newOption = $(document.createElement("option"));
    newOption.html("actor");
    $('#selectType').append(newOption);
    newOption = $(document.createElement("option"));
    newOption.html("role");
    $('#selectType').append(newOption);
    newOption = $(document.createElement("option"));
    newOption.html("agent");
    $('#selectType').append(newOption);
    newOption = $(document.createElement("option"));
    newOption.html("position");
    $('#selectType').append(newOption);

}
var secondSelectBoxHidden=false;
/**
 * Hides second dropdown if the user wants to search only for a model
 */
function hideSecondSelectBox()
{
    if(!secondSelectBoxHidden)
    {
        secondSelectBoxHidden=true;
        $('#selectTypeBox').fadeOut(ANIMSPEED);
        $('#selectSearchBox').animate({
            right: "-=160"
        }, ANIMSPEED, function() {
            // Animation complete.
        });
    }
}
/**
 * Shows the second dropdown to specify the exact type, if the user wants to search for an actor or ielement
 */
function showSecondSelectBox()
{
    if(secondSelectBoxHidden)
    {
        $('#selectSearchBox').animate({
            right: "+=160"
        }, ANIMSPEED, function() {
            $('#selectTypeBox').fadeIn(ANIMSPEED);
            secondSelectBoxHidden=false;
        });
    }
}
/**
 * Loads and applies the settings given in the configuration file
 */
function initPaths()
{

    $('#config').load("pathConfig.xml","",function(){

        var model=$('#config').find('model')[0];
        var visualizer=$('#config').find('visualizer')[0];
        var protocol=$('#config').find('protocol')[0];

        MODEL_SERVICE_ADDRESS=$(model).attr('path');
        VISUALIZER_SERVICE_ADDRESS=$(visualizer).attr('path');
        MODEL_SERVICE_NAME=$(model).attr('name');
        VISUALIZER_SERVICE_NAME=$(visualizer).attr('name');
        PROTOCOL=$(protocol).attr('name');
       init();


    });

}
/**
 * Shows a screen for database registration and optional field to write a message to the user manager
 */
function showRegisterDBScreen()
{

    sendModelRequest(_GET,"setting/register/DB","",function (data){

        if(data.trim()!="true")
        {

            $('#registerDBScreen').show();
        }
        else
        {
            alert("You are already registered!");
        }

    });
}
/**
 * Closes the screen for database registration
 */
function closeRegisterDBScreen()
{
    $('#mailContent').val("");
    $('#registerDBScreen').hide();
}
/**
 * Initialization
 * Settings are read, events registered, resources (svg-controls) loaded etc.
 */
function init()
{

    visURL=buildVisualizerURLBase();
    modelURL=buildModelURLBase();
	setAnimation();
	presentLogin();
	//login("asd","dsa")

    if(localStorage.lastLabelColor)
        lastLabelColor=localStorage.lastLabelColor;
    if(localStorage.lastNodeColor)
        lastNodeColor=localStorage.lastNodeColor;

    setColorPicker();
    registerEvents();

    initLocalSearchField();
    initSearchTypes();
    $('#svgControlElements').load("svgControls.svg","",function(){initControls();});



	
	
}