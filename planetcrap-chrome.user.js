// ==UserScript==
// @name          planetcrap
// @namespace     http://www.planetcrap.com/greasemonkey/
// @description   some helper functions for planetcrap 0.21 2012-01-08 21:08
// @match http://www.planetcrap.com/*
// @match http://planetcrap.com/*
// @match http://girlskissing.planetcrap.com/*
// ==/UserScript==

var plonkStr = '';
var plonkList = '';
var PLONK_LIST = 'plonkList'

// script entry point
function entryPoint() {

	if (! document.forms[0] ) {
		return;
	}
	
	try
   	{
    	initPlonkList();

        // loop over every comment on the page
        // adding quote buttons or plonking the post
        processComments();

        // add secondary page elements:
        // reply box helper links, wysiwyg preview, search box
        addExtraPageElements();

    	addStyles();

    	// register a click event handler to do the work of quoting when it happens
    	document.addEventListener('click', function(event) {
    	    var process = null;
    	    var baseNode;
    	    if (event.target.parentNode.className == "quotebutt") {
    	        process = true;
    	        baseNode = event.target.parentNode;
    	    } else if (event.target.parentNode.parentNode.className == "quotebutt") {
    	        process = true;
    	        baseNode = event.target.parentNode.parentNode;
    	    }
    		if (process) {
    			quoteText = getSelectionSafe();
    			if (quoteText.length > 0) {
    				// find the clicked post id and name
    				// TODO!!! find the parent of selection instead of parent of clicked button
    				var postId = baseNode.getAttribute('post_id');
    				var posterInfoChunk = baseNode.parentNode.textContent
    				processQuoteClick(postId, posterInfoChunk, getHTMLOfSelection());
    			} else {
    				// find the clicked post id and name
    				var postId = baseNode.getAttribute('post_id');
    				var posterInfoChunk = baseNode.parentNode.textContent
    				processQuoteClick(postId, posterInfoChunk, null);
    			}
    		} else {
				doFormattingForSelection(event.target.id);
			}
    	}, true);

    }
    catch (e)
    {
    	GM_log('script fail:' + e.name + ", " + e.message);
    }   	
}


window.addEventListener("load", entryPoint, false);

function get(url, cb) {
  GM_xmlhttpRequest({
    method: "GET",
     url: url,
     onload: function(xhr) { cb(xhr.responseText); }
  });
}

function getXML(url, cb) {
  GM_xmlhttpRequest({
    method: "GET",
     url: url,
     onload: function(xhr) {
         var xmlobject = (new DOMParser()).parseFromString(xhr.responseText, "text/xml");
         cb(xmlobject);
     }
  });
}


function getFromStorageWithDefault(itemName, defaultItem) {
	return localStorage.getItem(itemName) == null ? defaultItem : localStorage.getItem(itemName);
}

function editPlonkList() {
	var newPlonkList = prompt('Enter in user IDs to be plonked, delimited by ;', localStorage.getItem('plonkList'));
	if (newPlonkList != null) {
		localStorage.setItem('plonkList', newPlonkList);
	}
}

function initPlonkList () {
	embedFunction(editPlonkList);
	plonkStr = getFromStorageWithDefault(PLONK_LIST, '713;6443');
	localStorage.setItem(PLONK_LIST, plonkStr);
	plonkList = plonkStr.split(';');

	plonkCount = 0;
}



function processComments() {
	comments = getElementsByClass('comment-info');
	var numComments = comments.length;

	// install a quote button under each post info block
	for (i = 0; i < numComments; i++) {
		// Cheesy Changes -- Call to plonk
		if (plonked(comments[i]) == false)
		{
			var quoteDiv = document.createElement("span");
			quoteDiv.setAttribute("class", "quotebutt");
			// need to adjust the post id based on a plonking so the proper post is quoted
			quoteDiv.setAttribute("post_id", i-plonkCount);
		    quoteDiv.innerHTML = '<a href="#" onclick="return false;"><img border="0" src="data:image/gif;base64,R0lGODlhDwALALMAAFlZWaGhoc7OznR0dGJiYqqqqoaGhsXFxWtra7Ozs4%2BPj0dHRwAAAMDAwAAAAAAAACH5BAAAAAAALAAAAAAPAAsAAARFsCnTCmqN6c3CUscyCFiJMQiQKEtBmieyfHMCxzO72HcTKIoVqCGj7XrEXI3RMwAWAcKO2UtJFgcqzNAqLCicTeNwwPAiADs%3D"/></a>';

			comments[i].appendChild(quoteDiv);
		
		}
		else // post was plonked
		{
			plonkCount++;
		}
	}	
}


function addExtraPageElements() {
    
    addReplyBoxHelperLinks();
    addPreviewPane();
    addSearchForm();    
}


function addReplyBoxHelperLinks() {
	// install bold, italic etc helper links
	var helperLinksDiv = document.createElement("span");
	helperLinksDiv.innerHTML = ' <a href="#" class="helper" id="bold" accesskey="b" onclick="return false"><strong id="bold">b</strong></a>&nbsp;<a href="#" class="helper" id="italic" accesskey="i" onclick="return false"><em id="italic">it</em></a>&nbsp;<a href="#" class="helper" id="underline" accesskey="u" onclick="return false"><u id="underline">u</u></a>&nbsp;<a href="#" class="helper" id="strike" accesskey="s" onclick="return false"><del id="strike">strike</del></a>&nbsp;<a href="#" class="helper" id="helperlink" accesskey="l" onclick="return false">url</a>&nbsp;<a href="#" class="helper" id="helperquote" accesskey="q" onclick="return false">quote</a>&nbsp;<a href="#" class="helper" id="tt" accesskey="t" onclick="return false"><em id="tt">tt</em>&nbsp;</a><a href="#" class="helper" id="editPlonkList" onclick="editPlonkList(); return false;">edit plonk list</a>';
	commentBody = document.forms[0].elements.namedItem('comment[body]');
	commentBody.parentNode.insertBefore(helperLinksDiv, commentBody.previousSibling.previousSibling);
}

function addPreviewPane() {
	// LESLIE'S CHANGES START
	var previewWindow = document.createElement("div");
	previewWindow.className = 'preview-window';
	previewWindow.style.padding = '6px';
	previewWindow.style.height = '200px';
	previewWindow.style.border = '1px solid #ccc';
	previewWindow.style.backgroundColor = '#eee';
	previewWindow.style.overflow = 'auto';
	previewWindow.innerHTML = '';
	document.forms[0].elements.namedItem('comment[body]').parentNode.appendChild(previewWindow);
	document.addEventListener('keyup', function(event) {
		if ('comment[body]' == event.target.name) {
			updatePreview(event.target.value);
		}
	}, true);
	document.addEventListener('focus', function(event) {
		if ('comment[body]' == event.target.name) {
			updatePreview(event.target.value);
		}
	}, true);
	// LESLIE'S CHANGES FINISH
}

function addSearchForm() {
    embedFunction(crapSift);
    
    var searchForm = document.createElement("div");
    searchForm.className = 'pcgs-search';
    searchForm.id = 'pcgs-search';
    searchForm.innerHTML = '<form id="cs" style="margin: 10px 0px 0px 0px;" method="get" onsubmit="crapSift(this.form); return false" action="#">Search Term:&nbsp;<input type="text" id="q"></input>&nbsp;&nbsp;Poster:&nbsp;<input type="text" id="u"></input><input type="submit" style="width: 150px; margin-left: 10px;" value="Sift For Crap" name="submit" class="button"/></form>';
    document.forms[0].elements.namedItem('comment[body]').parentNode.appendChild(searchForm);
}



function embedFunction(s) {
    document.body.appendChild(document.createElement('script')).innerHTML=s.toString().replace(/([\s\S]*?return;){2}([\s\S]*)}/,'$2');
}

function crapSift(theForm) {
    
    var oldSearchResults = document.getElementById("pcgs-searchResults");
    if (oldSearchResults != null) {
        oldSearchResults.parentNode.removeChild(oldSearchResults);
    }
    var searchResults = document.createElement("div");
    
    var q = document.getElementById("cs").elements.namedItem('q').value;
    var u = document.getElementById("cs").elements.namedItem('u').value;
    
    searchResults.id = 'pcgs-searchResults';
    searchResults.innerHTML = '<iframe style="margin: 10px 0px 0px 0px; border: 0px; height: 800px;" src="http://crapsifter.jibble.net/search.php?searchterm=' +  q + '&poster=' + u + '" ' + 'width="100%" />';
    document.forms[0].elements.namedItem('comment[body]').parentNode.appendChild(searchResults);
}

function doFormattingForSelection(id) {
	commentBody = document.forms[0].elements.namedItem('comment[body]');
	quoteText = commentBody.value.substring(commentBody.selectionStart, commentBody.selectionEnd)
	if (quoteText.length <= 0) {
		return;
	}
	
	var startTag;
	var endTag;
	switch(id) {
		case 'bold':
		    startTag = '[b]';
		    endTag = '[/b]';
			break;
		case 'italic':
	        startTag = '[i]';
	        endTag = '[/i]';
			break;
		case 'underline':
			startTag = '[u]';
		    endTag = '[/u]';
			break;
		case 'strike':
			startTag = '[s]';
		    endTag = '[/s]';
			break;
		case 'helperlink':
			var URL = prompt('INSERT COIN' , 'http://');
		    if (URL == null || URL == '') {
			    return;
		    }
		    startTag = '[url=' + URL + ']';
		    endTag = '[/url]';
			break;
		case 'helperquote':
			startTag = '[quote]';
		    endTag = '[/quote]';
			break;
		case 'tt':
			startTag = '[tt]';
		    endTag = '[/tt]';
			break;
		default:
			return;
	}

	tagSelection(commentBody, quoteText, startTag, endTag);
}



function getSelectionSafe() {
	var text = window.getSelection();
	if (text.length > 0) {
		return text;
	}
	text = document.getSelection();
	if (text.length > 0) {
		return text;
	}
	return '';
}



function getHTMLOfSelection () {
	var range;
	if (document.selection && document.selection.createRange) {
		range = document.selection.createRange();
		return range.htmlText;
	}
	else if (window.getSelection) {
		var selection = window.getSelection();
		if (selection.rangeCount > 0) {
			range = selection.getRangeAt(0);
			var clonedSelection = range.cloneContents();
			var div = document.createElement('div');
			div.appendChild(clonedSelection);
			return div.innerHTML;
		}
		else {
			return '';
		}
	}
	else {
		return '';
	}
}



// a click was triggered on a quote link, so take the text of that post and
// put it into the comment box
// 0.14 - merged processSelectedQuoteClick() into it
function processQuoteClick(postId, posterInfoChunk, selection) {

	var splitChunk = posterInfoChunk.split('\n');
	var realPostId = splitChunk[1].split(' ')[0];
	var posterName = splitChunk[2];
	var quoteHeader = '';
	// add the post number and name
	quoteHeader = addQuoteHeader(realPostId, posterName);

	//create a link to comment body
	commentBody = document.forms[0].elements.namedItem('comment[body]');
	if (commentBody.value.length != 0) {
		commentBody.value += '\n';
	}

	//check if we want to quote just a selection or whole post
	if (selection !== null) {
		// put the cleaned comment body into the comment field
		commentBody.value += quoteHeader;
		commentBody.value += cleanQuote(selection);
	} else {
		// grab the clicked posts comment body
		// change the html to craptags and strip sig etc..
		var posts = getElementsByClass('comment');
		var cleanedQuoteBody = cleanQuote(posts[postId].innerHTML);
		// put the cleaned comment body into the comment field
		cleanedQuoteBody = quoteHeader + cleanedQuoteBody;
		commentBody.value += cleanedQuoteBody;
	}

	commentBody.focus();
}




function addQuoteHeader(realPostId, posterName) {
	return realPostId + ' by [b]' + posterName + '[/b]\n\n';
}



function cleanQuote(text) {
	// strip the sig if there
	sigIndex = text.lastIndexOf('<div class="sign'); 
	if (sigIndex != -1) {
		text = text.substring(0, sigIndex);
	}

	// replace nbsp's
	text = text.replace(/&nbsp;/g, ' ');

	// replace <br>'s
	text = text.replace(/<br>/g, '\n');
	
	// handle inner quotes and pesky newlines
	text = text.replace(/<div class="quote">/g, '\[quote\]');
	text = text.replace(/<\/div>\n/g, '\[/quote\]');
	text = text.replace(/<\/div>/g, '\[/quote\]');

    // deal with damn tt tag
    text = text.replace(/<span style="font-family: Courier New;">/g, '\[tt\]');
    text = text.replace(/<\/span>/g, '\[/tt\]');
    
	// replace links and emails with planetcrap markup
	text = text.replace(/<a href="/g, '\[url=');
	text = text.replace(/" target="_blank">/g, '\]');
	text = text.replace(/">/g, '\]');
	text = text.replace(/<\/a>/g, '\[/url\]');

	// replace bolds, italics, underlines and strikethrough
	text = text.replace(/<b>/g, '\[b\]');
	text = text.replace(/<\/b>/g, '\[/b\]');
	text = text.replace(/<i>/g, '\[i\]');
	text = text.replace(/<\/i>/g, '\[/i\]');
	text = text.replace(/<u>/g, '\[u\]');
	text = text.replace(/<\/u>/g, '\[/u\]');
	text = text.replace(/<s>/g, '\[s\]');
	text = text.replace(/<\/s>/g, '\[/s\]');

	// trim
	text = text.replace(/^\s+|\s+$/, '');

	// add some clean start and end quotes
	text = '[quote]' + text + '[/quote]\n';
	text = text.replace(/\n\[\/quote\]/g, '\[/quote\]');

	text = text.replace(/\n\n\n/g, '\n');

	return text;
}



function getElementsByClass(searchClass,node,tag) {

	var classElements = new Array();
	
	if ( node == null ) {
		node = document;
	}
	
	if ( tag == null ) {
		tag = '*';
	}

	var els = node.getElementsByTagName(tag);
	var elsLen = els.length;
	var pattern = new RegExp('(^|\\s)'+searchClass+'(\\s|$)');

	for (i = 0, j = 0; i < elsLen; i++) {
		if ( pattern.test(els[i].className) ) {
			classElements[j] = els[i];
			j++;
		}
	}
	return classElements;
}

// Cheesy's Changes START
function getUserIDFromCommentInfo(comment)
{
	// get the 2nd child <A> object, it has the user id in the href.
	// format of the link: http://www.planetcrap.com/users/951/
	// so, the user ID would be the 5th field
	aTag = comment.getElementsByTagName('A')[1];
	userId = aTag.href.split('/')[4];
	return userId;
}

function plonkable(userID)
{
	for(var i = 0; i < plonkList.length; i++)
	{
		if (plonkList[i] == userID)
			return true;
	}
	return false;
}

function plonked(comment)
{
	userId = getUserIDFromCommentInfo(comment);

	// determine if 'plonked'
	if (plonkable(userId) == true)
	{
		// walk the parent nodes until we find the table object with the 'block' class
		node = comment.parentNode;
		// plonk by getting the closest parent table.block element
		while( node )
		{
			// the table containing the whole post is in the 'block' class. look for that
			// i suppose it could be hard coded with several levels of .parentnode, but whatever
			if (node.className.search(/block/) > -1)
			{
				// this seems to be the most effective to plonk it.
				if(node.parentNode)   // check just in case
					node.parentNode.removeChild(node);
				return true;
			}
			node = node.parentNode;
		}
	}
	return false;
}
// Cheesy's Changes END

// LESLIE'S CHANGES START
function updatePreview(v)
{
	var preview = getElementsByClass('preview-window', null, 'div');
	if (preview) {
		var post = v;
		post = post.replace(/\n/g, '<br />');
		post = post.replace(/\[quote\]/g, '<blockquote>');
		post = post.replace(/\[\/quote\]/g, '</blockquote>');
		post = post.replace(/\[b\]/g, '<b>');
		post = post.replace(/\[\/b\]/g, '</b>');
		post = post.replace(/\[i\]/g, '<i>');
		post = post.replace(/\[\/i\]/g, '</i>');
		post = post.replace(/\[u\]/g, '<u>');
		post = post.replace(/\[\/u\]/g, '</u>');
		post = post.replace(/\[s\]/g, '<s>');
		post = post.replace(/\[\/s\]/g, '</s>');
		post = post.replace(/\[tt\]/g, '<span style="font-family: Courier New;">');
		post = post.replace(/\[\/tt\]/g, '</span>');
		post = post.replace(/\[url=(.*?)\]/g, '<a href="$1" target="_blank">');
		post = post.replace(/\[\/url]/g, '</a>');
		preview[0].innerHTML = post;
	}
}
// LESLIE'S CHANGES FINISH



function addGlobalStyle(css) {
		var head, style;
		head = document.getElementsByTagName('head')[0];
		if (!head) { return; }
		style = document.createElement('style');
		style.type = 'text/css';
		style.innerHTML = css;
		head.appendChild(style);
}



function tagSelection(textArea, quote, startTag, endTag) {
	startString = textArea.value.substring(0, textArea.selectionStart);
	endString = textArea.value.substring(textArea.selectionEnd);
	setAndFocus(textArea, startString + startTag + quote + endTag + endString)
}



function setAndFocus(node, text) {
	node.value = text;
	node.focus();
}



function addStyles() {
	//default
	addGlobalStyle('.preview-window blockquote { color: #666 ! important; margin-top: 0px; margin-bottom: 0px; }');
	addGlobalStyle('#bold, #italic, #underline, #strike, #helperlink, #helperquote, #tt { font-weight: normal; color: #000; }');
	addGlobalStyle('#tt { font-family: Courier New; }');
}
