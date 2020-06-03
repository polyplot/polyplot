/* Polyplot is copyright 2020 by Polyplot Berlin */


"use strict";

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

const endString = "<p>&nbsp;</p><p>&nbsp;</p><p>&nbsp;</p>";

var currentZoom = 100;
var minZoom = 80;
var maxZoom = 140;
var book = false;
var v = {
	pp_scroll_ptr: 0,
	pp_html_ptrcounter: 0, 
	pp_html: ""
};
var jumping = null;
var debugCounter = 0;	
var current_options = [];
var tags = {};
var last_if = false;
var didScroll = false;

$(document).ready(function() {
	loadVars();
	loadBook();
	saveVars();
});

$('#booktext').scroll(function() {
	didScroll = true;
});

setInterval(function() {
    if ( didScroll ) {
        didScroll = false;
		v['pp_scroll_ptr'] = scrollPosition();
		saveVars();
		console.log("stored pos");
    }
}, 2000);

function resetBook() {
	$("input").prop("checked", false);
	window.localStorage.clear();
	window.location.reload(true);
}

function startOver() {
	$("input").prop("checked", false);
	v['pp_html'] = "";
	delete v['pp_book_ptr'];
	delete v['pp_html_ptr'];
	saveVars();
	window.location.reload(true);
}

function fontBigger(){
	if (currentZoom < maxZoom) {
		currentZoom += 20;
		doZoom();
		$("#smaller").removeClass("disabled");
	}
	if (currentZoom >= maxZoom) {
		$("#bigger").addClass("disabled");
	} 
}

function fontSmaller(){
	if (currentZoom > minZoom) {
		currentZoom -= 20;
		doZoom();
		$("#bigger").removeClass("disabled");
	}
	if (currentZoom <= minZoom) {
		$("#smaller").addClass("disabled");
	}     	
}

function doZoom() {
	var pos = scrollPosition();
	$('#booktext').css('zoom', currentZoom + '%');
	scrollPosition(pos);
}

function scrollPosition(pos=null) {
	var scroll = $(window).scrollTop();
	var elements = $("#booktext").children();
	var el;
	if (pos === null) {
		for (var i=0; i<elements.length; i++) {
			el = $(elements[i]);
			if (el.offset().top >= scroll && el.is(':visible')){
				return i;
			}
		}
	} else {
		if (pos >= elements.length) return false;
		el = $(elements[pos]);
		setTimeout(function(){
			el[0].scrollIntoView();
		},50);		
		return true;
	}
}

function toggleDark() {
	$("input").prop("checked", false);
	if (!v['pp_dark']) {
		dark();
		v['pp_dark'] = true;
	} else {
		light();
		delete v['pp_dark'];
	}
	saveVars();
}

function dark() {
	$('#booktext').addClass('dark');
	$('#booktext').removeClass('light');
	$('#dark').html('Light Mode');
}

function light() {
	$('#booktext').addClass('light');
	$('#booktext').removeClass('dark');
	$('#dark').html('Dark Mode');
}

function toggleSerif() {
	$("input").prop("checked", false);
	if (!v['pp_serif']) {
		serif();
		v['pp_serif'] = true;
	} else {
		sans_serif();
		delete v['pp_serif'];
	}
	saveVars();
}

function serif() {
	$('#booktext').addClass('serif');
	$('#booktext').removeClass('sans');
	$('#serif').html('Sans-Serif');
}

function sans_serif() {
	$('#booktext').addClass('sans');
	$('#booktext').removeClass('serif');
	$('#serif').html('Serif');
}

function debugCount() {
	return ++debugCounter;
}

function dbgstr(str) {
	var ret = str;
	ret = ret.replace(/\n/g, "\\n");
	if (ret.length > 170) {
		ret = ret.substring(0, 80) + " ... [len " + str.length + "] ... " 
		  + ret.substr(-80);
	}
	return ret;
} 

function newHtmlPtr() {
	return ++v['pp_html_ptrcounter'];
}

function loadBook() {
	console.log("loadBook");
	if (v['pp_dark']) { dark(); } else { light(); }
	if (v['pp_serif']) { serif(); } else { sans_serif(); }
	if (!book) {
		var xmlhttp = new XMLHttpRequest ();
		xmlhttp.open('GET', 'book.txt', false);
		xmlhttp.send();
		book = xmlhttp.responseText + endString;
	}
	if (v['pp_html_ptr'] && v['pp_book_ptr'] != 'end') {
		var html_ptr_comment = "<!-- " + v['pp_html_ptr'] + " -->";
		var found = v['pp_html'].indexOf(html_ptr_comment);
		if (found != -1) {
			v['pp_html'] = v['pp_html'].substring(0, found);
			console.log("skipped to html_ptr: " + html_ptr_comment);
		}
	}
	// Replace \{ and \} with unicode braces that don't trigger polyParse() 
	book = book.replace ("\\{", ' ❴');
	book = book.replace ("\\}", '❵ ');
	// Run polyParse on whole thing	
	v['pp_html'] += polyParse(book, true);
	// Put back the escaped curly braces
	v['pp_html'] = v['pp_html'].replace (' ❴', '{');
	v['pp_html'] = v['pp_html'].replace ('❵ ', '}');
	// Everything that wasn't a tag becomes <p>
	v['pp_html'] = v['pp_html'].replace (/^([^<>]\w+.*)$/mg, '<p>$1</p>\n');
	$('#booktext').html(v['pp_html']);
	scrollPosition(v['pp_scroll_ptr']);
	saveVars();
}

function saveVars() {
	window.localStorage.setItem('v', JSON.stringify(v));
	if (urlParams.has('vars')) variableWindow();
}

function variableWindow() {
	window.open('basement/variable_window.html','variables','directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=400,height=350');
}

function loadVars() {
	var vars = window.localStorage.getItem('v');
	if (vars) {
		v = JSON.parse(vars);
		console.log("got vars");
	}
}

function killVars() {
	window.localStorage.clear();
}

function idLocation(id) {
	if (id == 'end') return book.length;
	var re = new RegExp('\\{(?:options|anchor) ' + id + '[\\W$]');
	var x = book.search(re);
	if (x == -1) {
		console.log("ID not found: " + id);
		return 0;
	}
	return x;
}

function polyParse(text, root=false) {
	var thisNum = debugCount();
	var fnid = "polyParse[" + thisNum + "]";
	console.log(fnid + " gets: " + dbgstr(text));
	if (jumping && !root) {
		console.log(fnid + " returning early because root handles jumps"); 
		return;
	}
	var ret = "";
	var index = 0;
	if (root && v['pp_book_ptr']) {
		index = idLocation(v['pp_book_ptr'])
	}
	while(true){
		var tagstart = text.indexOf("{", index);
		if (tagstart == -1) {
			ret += copied(text.substr(index));
			break;
		} else {
			ret += copied(text.substring(index, tagstart));
			var tagend = tagstart + 1;
			var recursion = 1;
			while (true) {
				if (text[tagend] == "}" && text[tagend - 1] != "\\") {
					recursion--;
					if (recursion == 0) break;
				}
				if (text[tagend] == "{" && text[tagend - 1] != "\\") recursion++;
				tagend++;
				if (tagend > text.length + 1) {
					throw new Error("Curly brace from char " + tagstart
					  + " was never closed.");
				}
			}
			ret += tagParse(text.substring(tagstart + 1, tagend));
			if (jumping) {
				if (root) {
					if (jumping == "end") {
						jumping = null;
						console.log(fnid + " end reached, returning: "
						  + dbgstr(text));
						return ret + endString;
					}
					index = idLocation(jumping);	
					jumping = null;
				} else {
					break;
				}
			} else {
				index = tagend + 1;
			}
		}
	}
	console.log(fnid + " returns: " + dbgstr(ret));
	return ret;
}

function oneSplit(sep, str) {
	var s = str.search(sep);
	if (s == -1) return [str, ""];
	return [str.substring(0, s).trim(), str.substring(s+1).trim()];
}

function copied(str) {
	return (' ' + str).slice(1);
}

function doEval(script) {
	var modscr = '"use strict";' + script.replace(/\$(\w+)/g, "v['$1']");
	//console.log("eval: " + modscr);
	return eval(modscr);
}

function clickOption(optionvar, book_ptr, html_ptr) {
	if (v['pp_lock'] && html_ptr < v['pp_html_ptr']) {
		window.alert(v['pp_locktext']);
		return;
	}
	v['pp_book_ptr'] = book_ptr;
	v['pp_html_ptr'] = html_ptr;
	v[optionvar + "_selected"] = true;
	v[optionvar + "_ever"] = true;
	v[optionvar] = true;
	saveVars();
	loadBook(book_ptr, html_ptr);
}

function tagParse(tag) {
	var thisNum = debugCount();
	var fnid = "tagParse[" + thisNum + "]";
	console.log(fnid + " gets: " + dbgstr(tag));
	var parts = oneSplit(/\s+/, tag)
	try {
		var func = eval("tag_" + parts[0]);
	}
	catch(err) {
		var func = false;
	}	
	if (func) {
		var ret = func(parts[1]);
	} else {
		var ret = tag_unknown(tag);
	}
	if ($.type(ret) === 'string') {
		console.log(fnid + " exits, returns: " + dbgstr(ret));
		return ret;
	} else {
		console.log(fnid + " exits.");
		return "";
	}
}

// Below are all the tags shipped with Polyplot. You can make your own
// tags by just creating a function like one of these in the book.js file.

function tag_anchor(tagtext) {
	return "";
}

function tag_chapter(tagtext) {
	var parts = oneSplit(" ", tagtext);
	return "\n<h2>" + parts[1] + "</h2>\n";
}

function tag_else(tagtext) {
	if (!last_if) {
		return polyParse(tagtext);
	}
}

function tag_end(tagtext) {
	console.log("endtag");
	jumping = 'end';
	v['pp_book_ptr'] = 'end';
}

function tag_lock(tagtext) {
	v['pp_lock'] = true;
	v['pp_locktext'] = tagtext;
	saveVars();
}

function tag_option(tagtext) {
	current_options.push(tagtext);
}

function tag_if(tagtext) {
	var parts = oneSplit(":", tagtext);
	last_if = doEval(parts[0]);
	if (last_if) {
		return polyParse(parts[1]);
	}
}

function tag_jump(tagtext) {
	jumping = tagtext;
	v[tagtext] = true;
}

function tag_options(tagtext) {
	var options_id = oneSplit(/\s/m, tagtext)[0];
	v['pp_html_ptr'] = newHtmlPtr();
	v['pp_book_ptr'] = options_id;
	console.log("setting book_ptr to: " + options_id);
	saveVars();
	var ret = "\n<!-- " + v['pp_html_ptr'] + " -->\n";
	ret += "<ul>\n"
	var got_one = false;
	current_options = [];
	var current_v = [];
	polyParse(tagtext);
	current_options.forEach(function(option){
		var option_var = oneSplit(" ", option)[0];
		if (v[option_var]) delete v[option_var];
	});
	current_options.forEach(function(option){
		var parts = oneSplit(" ", option);
		var option_var = parts[0];
		var parts2 = oneSplit(":", parts[1]);
		var option_text = parts2[0];
		var option_cmds = parts2[1];
		option = parts[1];
		var href = "javascript:clickOption('" + option_var + "', '" 
		  + options_id + "', " + v['pp_html_ptr'] + ")";
		if (v[option_var + "_selected"]) {
			got_one = true;
			ret += '<li class="selected">' + option_text + '</li>\n';
			polyParse(option_cmds);
			v[option_var] = true;
			delete v[option_var + "_selected"];
		} else if (v[option_var + "_ever"]) {
			ret += '<li><a class="before" href="' + href + '">' 
			  + option_text + '</a></li>\n';
		} else {
			ret += '<li><a href="' + href + '">' + option_text + '</a></li>\n';
		}
	});
	ret += '</ul>';
	if (!got_one) jumping = 'end';
	return ret;
}

function tag_print(tagtext) {
	return doEval(tagtext);
}

function tag_unknown(tagtext) {
	doEval(tagtext);
}

function tag_unlock(tagtext) {
	v['pp_lock'] = false;
	saveVars();
}