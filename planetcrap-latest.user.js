// --------------------------------------------------------------------
//
// This is a Greasemonkey user script.
//
// To install, you need Greasemonkey: http://greasemonkey.mozdev.org/
// Then restart Firefox and revisit this script.
// Under Tools, there will be a new menu item to "Install User Script".
// Accept the default configuration and install.
//
// To uninstall, go to Tools/Manage User Scripts,
// select "planetcrap", and click Uninstall.
//
// includes changes from:
//
// Leslie
// Assemblerer
// CheesyPoof
// Owen Butler
//
// --------------------------------------------------------------------
//
// ==UserScript==
// @name          planetcrap
// @namespace     http://www.planetcrap.com/greasemonkey/
// @description   some helper functions for planetcrap 0.20 2008-27-06 11:07
// @include       http://www.planetcrap.com/*
// @include       http://planetcrap.com/*
// @include       http://girlskissing.planetcrap.com/*
// ==/UserScript==

var KEY_QUOTESTYLE = 'planetcrapQuoteStyle';
var KEY_QUOTEBUTTONSTYLE = 'test11';
var KEY_HELPERSTYLE = 'test12';
var KEY_BLOCKQUOTESTYLE = 'test13';

var STYLE_DEFAULT = 'default';
var STYLE_MONTY = 'monty';
var STYLE_GAGGLE = 'gaggle';
var STYLE_NONE = 'none';
var STYLE_GMAN = 'gman';
var STYLE_CHEESY = 'cheesy';
var STYLE_DUM = 'dum';
var STYLE_BUTTON_ASS = 'button_ass';
var STYLE_BUTTON_DUM = 'button_dum';
var STYLE_BUTTON_DEFAULT = 'none';
var STYLE_HELPER_ASS = 'helper_ass';
var STYLE_HELPER_DEFAULT = 'none';
var STYLE_BLOCKQUOTE_ASS = 'blockquote_ass';
var STYLE_BLOCKQUOTE_DEFAULT = 'none';

// Cheesy's changes START
var KEY_PLONKLIST = 'plonkID';
var plonkStr = '';
var plonkList = '';
// Cheesy's changes END

// script entry point
function entryPoint() {

	if (! document.forms[0] ) {
		return;
	}
	
	try
   	{
    	setupMenuItems();

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
    		}
    	}, true);

    	initNewPostChecker();
    }
    catch (e)
    {
    	GM_log('script fail:' + e.name + ", " + e.message);
    }   	
}


window.addEventListener("load", entryPoint, false);

function initNewPostChecker() {
    millisBetweenChecks = 10000;
    checkCount = 0;
    
    // get the current thread id
    threadId = document.forms[0].elements.namedItem('thread_id').value;
    GM_log("thread_id is " + threadId);
    
    // find the maximum thread id
    maxThreadId = null;
    findMaxThreadId();
    
    window.setTimeout(checkNewPosts, millisBetweenChecks);
    
    baseUrl = 'http://planetcrap.com/blah2.php?action=xml&mode=topics&limit=1';
    
    errorShutItAllDownFrank = false;
    foundNewPosts = false;
}

function findMaxThreadId() {
    getXML('http://www.planetcrap.com/blah2.php?action=xml&mode=topics&limit=1', function(xml) {
        maxThreadId = xml.getElementsByTagName('first_thread_id')[0].textContent;
    });
}

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


function checkNewPosts() {
    if (foundNewPosts || errorShutItAllDownFrank) {
        return;
    }

    try {
        if (maxThreadId != null) {

            // calculate the offset we need
            var offset = maxThreadId - threadId;

            GM_log("about to use offset " + offset);
            var url = baseUrl + '&offset=' + offset;
            GM_log("about to use url " + url);

            getXML(url, function(xml) {
                try {
                    var unread_count = xml.getElementsByTagName('unread_count')[0].textContent;
                    if (unread_count > 0) {
                        GM_log("WE HAVE UNREAD POSTS");
                        foundNewPosts = true;

                        installUnreadPostsIndicator(xml);                
                    }
                }
                catch (e) {
                    GM_log('get of URL failed: ' + e.name + ", " + e.message);
                    errorShutItAllDownFrank = true;
                }
            });
        }

        checkCount++;
        if (checkCount < 10) {
            window.setTimeout(checkNewPosts, millisBetweenChecks);
        }    
    }
    catch (e) {
        GM_log('check new posts failed: ' + e.name + ", " + e.message);
    }    
}

function installUnreadPostsIndicator(xml) {
    
    // http://planetcrap.com/topics/thread id/offset and paging?/anchor point
    // find the offset/page
    var numPosts = xml.getElementsByTagName('comment_count')[0].textContent;
    var offsetAndPage = '';
    if (numPosts < 200) {
        offsetAndPage = '100';
    } else {
        var offset = numPosts - (numPosts % 100);
        offsetAndPage = offset + '-100';
    }
    // find the anchor point
    var anchorPoint = '#' + (xml.getElementsByTagName('comment_count')[0].textContent - (xml.getElementsByTagName('unread_count')[0].textContent - 1));
    
    var unreadUrl = '/topics/' + xml.getElementsByTagName('id')[0].textContent + '/' + offsetAndPage + '/' + anchorPoint;
    var unreadDiv = document.createElement("div");
    var imageUrl = '<img border="0" src="http://planetcrap.com/blahdata/themes/crap6/images/topic_new.gif"/>';
	unreadDiv.innerHTML = '<a href="' + unreadUrl + '" >' + imageUrl + '&nbsp;There are unread posts&nbsp;' + imageUrl + '</a>';
	document.forms[0].parentNode.insertBefore(unreadDiv, document.forms[0]);
}

function setupMenuItems() {
	// set our menu items
	GM_registerMenuCommand('set quote style:', function(event) { /* nothing */ } );
	 
	GM_registerMenuCommand('- default', function(event) {
		GM_setValue(KEY_QUOTESTYLE, STYLE_DEFAULT);
	} );
	GM_registerMenuCommand('- none', function(event) {
		GM_setValue(KEY_QUOTESTYLE, STYLE_NONE);
	} );
	
	GM_registerMenuCommand('- monty', function(event) {
		GM_setValue(KEY_QUOTESTYLE, STYLE_MONTY);
	} );
	
	GM_registerMenuCommand('- gaggle', function(event) {
		GM_setValue(KEY_QUOTESTYLE, STYLE_GAGGLE);
	} );
	
	GM_registerMenuCommand('- gman', function(event) {
		GM_setValue(KEY_QUOTESTYLE, STYLE_GMAN);
	} );
	
	GM_registerMenuCommand('- CheesyPoof', function(event) {
		GM_setValue(KEY_QUOTESTYLE, STYLE_CHEESY);
	} );
	
	GM_registerMenuCommand('- dumdeedum', function(event) {
		GM_setValue(KEY_QUOTESTYLE, STYLE_DUM);
	} );
	
    GM_registerMenuCommand('quote button type:', function(event) { /* nothing */ } );
	GM_registerMenuCommand('- huge', function(event) {
		GM_setValue(KEY_QUOTEBUTTONSTYLE, STYLE_BUTTON_ASS);
	} );
	
	GM_registerMenuCommand('- small image', function(event) {
		GM_setValue(KEY_QUOTEBUTTONSTYLE, STYLE_BUTTON_DUM);
	} );
	
	GM_registerMenuCommand('- text link (default)', function(event) {
		GM_setValue(KEY_QUOTEBUTTONSTYLE, STYLE_BUTTON_DEFAULT);
	} );
	
	GM_registerMenuCommand('editor buttons type:', function(event) { /* meh */ } );
	GM_registerMenuCommand('- buttons', function(event) {
		GM_setValue(KEY_HELPERSTYLE, STYLE_HELPER_ASS);
	} );
	
	GM_registerMenuCommand('- links (default)', function(event) {
		GM_setValue(KEY_HELPERSTYLE, STYLE_HELPER_DEFAULT);
	} );
	
	GM_registerMenuCommand('misc:', function(event) { /* meh */ } );
	GM_registerMenuCommand('- make quotes fugly', function(event) {
		GM_setValue(KEY_BLOCKQUOTESTYLE, STYLE_BLOCKQUOTE_ASS);
	} );
	
	GM_registerMenuCommand('- make quotes look normal again', function(event) {
		GM_setValue(KEY_BLOCKQUOTESTYLE, STYLE_BLOCKQUOTE_DEFAULT);
	} );
};


function initPlonkList () {
	// Cheesy's Changes START
	plonkStr = GM_getValue( KEY_PLONKLIST, '713');
	plonkList = plonkStr.split( ';' );

	// quick & dirty way to administer the plonk list
	// not so simple and dirty would be to add a plonk button next to the quote button to plonk that user
	// still, it would have to be based on ID# and not user name as PC can have duplicate user names
	GM_registerMenuCommand('- administer Plonk list', function(event)
		{
			var newPlonk = prompt('Enter in user IDs to be plonked, delimited by ;', plonkStr );
			if (newPlonk != null)
			{
				plonkStr = newPlonk;
				plonkList = plonkStr.split(";");
				GM_setValue(KEY_PLONKLIST, plonkStr);
				alert("Updated plonk list: " + plonkList);
			}
		}
	);

	plonkCount = 0;
	// Cheesy's Changes END
}


function processComments() {
	comments = getElementsByClass('comment-info');
	var numComments = comments.length;

    var buttonStylePreference = GM_getValue(KEY_QUOTEBUTTONSTYLE, STYLE_BUTTON_DEFAULT);

	// install a quote button under each post info block
	for (i = 0; i < numComments; i++) {
		// Cheesy Changes -- Call to plonk
		if (plonked(comments[i]) == false)
		{
			var quoteDiv = document.createElement("span");
			quoteDiv.setAttribute("class", "quotebutt");
			// need to adjust the post id based on a plonking so the proper post is quoted
			quoteDiv.setAttribute("post_id", i-plonkCount);
			if (buttonStylePreference == STYLE_BUTTON_DUM) {
			    quoteDiv.innerHTML = '<a href="#" onclick="return false;"><img border="0" src="data:image/gif;base64,R0lGODlhDwALALMAAFlZWaGhoc7OznR0dGJiYqqqqoaGhsXFxWtra7Ozs4%2BPj0dHRwAAAMDAwAAAAAAAACH5BAAAAAAALAAAAAAPAAsAAARFsCnTCmqN6c3CUscyCFiJMQiQKEtBmieyfHMCxzO72HcTKIoVqCGj7XrEXI3RMwAWAcKO2UtJFgcqzNAqLCicTeNwwPAiADs%3D"/></a>';
			} else {
			    quoteDiv.innerHTML = '<a href="#" onclick="return false;">quote</a>';
			}

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
	helperLinksDiv.innerHTML = ' <a href="#" class="helper" id="bold" accesskey="b" onclick="return false"><strong>b</strong></a>&nbsp;<a href="#" class="helper" id="italic" accesskey="i" onclick="return false"><em>it</em></a>&nbsp;<a href="#" class="helper" id="underline" accesskey="u" onclick="return false"><u>u</u></a>&nbsp;<a href="#" class="helper" id="strike" accesskey="s" onclick="return false"><del>strike</del></a>&nbsp;<a href="#" class="helper" id="helperlink" accesskey="l" onclick="return false">url</a>&nbsp;<a href="#" class="helper" id="helperquote" accesskey="q" onclick="return false">quote</a>&nbsp;<a href="#" class="helper" id="tt" accesskey="t" onclick="return false"><em>tt</em></a>';
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
	doFormattingForSelection(event.target.id);
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
    searchResults.innerHTML = '<iframe style="margin: 10px 0px 0px 0px; border: 0px; height: 800px;" src="http://crapsifter.jibble.net/search.php?searchterm=' + 
    q + 
    '&poster=' + u + '" ' + 'width="100%" />';
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



//function processSelectedQuoteClick(text) {
//	commentBody = document.forms[0].elements.namedItem('comment[body]');
//	if (commentBody.value.length != 0) {
//		commentBody.value += '\n';
//	}
//	commentBody.value += cleanQuote(text);
//	commentBody.focus();
//}



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
	// find the users quote style preference
	var quoteStylePreference = GM_getValue(KEY_QUOTESTYLE, STYLE_DEFAULT);

	var quoteHeader = '';
	// add the post number and name
	switch(quoteStylePreference) {
		case STYLE_DEFAULT:
			quoteHeader = realPostId + ' by [b]' + posterName + '[/b]\n\n';
			break;
		case STYLE_NONE:
			quoteHeader = '\n';
			break;
		case STYLE_MONTY: 
			quoteHeader = '[b]' + posterName + '[/b] (' + realPostId + '):\n';
			break;
		case STYLE_GAGGLE:
			quoteHeader = realPostId + ' by [b]' + posterName + '[/b]\n';
			break;
		case STYLE_GMAN:
			quoteHeader = '[b]' + posterName + ' said in ' + realPostId + ':[/b]\n';
			break;
		case STYLE_CHEESY:
			quoteHeader = '[b]' + realPostId + ' by ' + posterName + '[/b]\n';
			break;
		case STYLE_DUM:
			quoteHeader = '[b]' + posterName + '[/b]\n';
			break;
		default:
			quoteHeader = 'ERROR';
	}
	return quoteHeader;
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
	// find other style preferences
	var buttonStylePreference = GM_getValue(KEY_QUOTEBUTTONSTYLE, STYLE_BUTTON_DEFAULT);
	var helperStylePreference = GM_getValue(KEY_HELPERSTYLE, STYLE_HELPER_DEFAULT);
	var blockquoteStylePreference = GM_getValue(KEY_BLOCKQUOTESTYLE, STYLE_BLOCKQUOTE_DEFAULT);

	//quote button style
	switch(buttonStylePreference) {
		case STYLE_BUTTON_ASS:
			addGlobalStyle('.quotebutt { float: right; margin:0px; padding:3px 12px 5px; border: 1px #777 solid; background-color:#ccc; }\n');
			break;
		case STYLE_BUTTON_DEFAULT:
		default:
			break;
	}

	//button style to helper links
	switch(helperStylePreference) {
		case STYLE_HELPER_ASS:
			addGlobalStyle('.helper { padding: 3px 5px 5px; border: 1px #777 solid; background-color:#ccc; }\n');
			break;
		case STYLE_HELPER_DEFAULT:
		default:
			break;
	}

	//quote style to make your eyes bleed
	switch(blockquoteStylePreference) {
		case STYLE_BLOCKQUOTE_ASS:
			addGlobalStyle('.quote { border: #999 solid 1px; border-left: #77a 6px solid; background-color: #f8f8f8; }\n');
			break;
		case STYLE_BLOCKQUOTE_DEFAULT:
		default:
			break;
	}

	//default
	addGlobalStyle('.preview-window blockquote { color: #666 ! important; margin-top: 0px; margin-bottom: 0px; }');
	addGlobalStyle('#bold, #italic, #underline, #strike, #helperlink, #helperquote, #tt { font-weight: normal; color: #000; }');
	addGlobalStyle('#tt { font-family: Courier New; }');
}
