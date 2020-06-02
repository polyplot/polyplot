/* Polyplot is copyright 2020 by Polyplot Berlin */


"use strict";

const endString = "<p>&nbsp;</p><p>&nbsp;</p><p>&nbsp;</p>";

var currentZoom = 100;
var minZoom = 80;
var maxZoom = 140;
var vars = { 
	poly_stopcounter: 0, 
	poly_pointer: 0,
	poly_stop: false,
	html: ""
};
var jumping = null;
var debugCounter = 0;	
var current_options = [];
var tags = {};
var last_if = false;
var thistaglocation;

function resetBook() {
	$("input").prop("checked", false);
	window.localStorage.clear();
	window.location.reload(true);
}

function startOver() {
	$("input").prop("checked", false);
	vars['html'] = "";
	vars['poly_pointer'] = 0;
	vars['poly_stop'] = null;
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
	var scroll = $(window).scrollTop();
	var elements = $("#booktext").children();
	var el;
	for (var i=0; i<elements.length; i++) {
		el = $(elements[i]);
		if (el.offset().top >= scroll && el.is(':visible')){
			break;
		}
	}
	$('#booktext').css('zoom', currentZoom + '%');
	setTimeout(function(){
		el[0].scrollIntoView();
	},50);
}

function toggleDark() {
	$("input").prop("checked", false);
	if (!vars['poly_dark']) {
		dark();
		vars['poly_dark'] = true;
	} else {
		light();
		delete vars['poly_dark'];
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
	if (!vars['poly_serif']) {
		serif();
		vars['poly_serif'] = true;
	} else {
		sans_serif();
		delete vars['poly_serif'];
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

$(document).ready(function() {
	loadVars();
	loadBook();
});


function debugCount() {
	return ++debugCounter;
}

function dbgstr(str) {
	return str;
	var ret = str;
	ret = ret.replace(/\n/g, "\\n");
	if (ret.length > 170) {
		ret = ret.substring(0, 80) + " ... [len " + str.length + "] ... " 
		  + ret.substr(-80);
	}
	return ret;
} 

function newStopNumber() {
	return ++vars['poly_stopcounter'];
}

function loadBook() {
	console.log("loadBook");
	if (vars['poly_dark']) { dark(); } else { light(); }
	if (vars['poly_serif']) { serif(); } else { sans_serif(); }
	var xmlhttp = new XMLHttpRequest ();
	xmlhttp.open('GET', 'book.txt', false);
	xmlhttp.send();
	var book = xmlhttp.responseText + endString;
	if (vars['poly_stop']) {
		var stopcomment = "<!-- " + vars['poly_stop'] + " -->";
		var found = vars['html'].indexOf(stopcomment);
		if (found != -1) {
			vars['html'] = vars['html'].substring(0, found);
			console.log("skipped to: " + stopcomment);
		}
	}
	// Replace \{ and \} with unicode braces that don't trigger polyParse() 
	book = book.replace ("\\{", ' ❴');
	book = book.replace ("\\}", '❵ ');
	// Run polyParse on whole thing	
	vars['html'] += polyParse(book, true);
	// Put back the escaped curly braces
	vars['html'] = vars['html'].replace (' ❴', '{');
	vars['html'] = vars['html'].replace ('❵ ', '}');	
	// Headers
	vars['html'] = vars['html'].replace (/^# (.+)$/mg, '<h2>$1</h2>\n');
	// Everything that wasn't a tag becomes <p>
	vars['html'] = vars['html'].replace (/^([^<>]\w+.*)$/mg, '<p>$1</p>\n');
	$('#booktext').html(vars['html']);
	saveVars();
}

function saveVars() {
	window.localStorage.setItem('vars', JSON.stringify(vars));
}
	
function loadVars() {
	var v = window.localStorage.getItem('vars');
	if (v) {
		vars = JSON.parse(v);
		console.log("got vars");
	}
}

function killVars() {
	window.localStorage.clear();
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
	if (root) index = vars['poly_pointer'];
	while(true){
		var tagstart = text.indexOf("{", index);
		if (tagstart == -1) {
			ret += copied(text.substr(index));
			break;
		} else {
			if (root) thistaglocation = tagstart;
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
					var re = new RegExp('\\{anchor\\s+' + jumping + '\\s*\\}');
					var begin = text.search(re);
					if (begin == -1) {
						throw new Error('Jump target "' + jumping 
						  + '" not found');
					}
					index = text.indexOf('}', begin) + 1;	
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
	var modscr = '"use strict";' + script.replace(/\$(\w+)/g, "vars['$1']");
	//console.log("eval: " + modscr);
	return eval(modscr);
}

function clickOption(optionvar, pointer, stopnr) {
	if (vars['poly_lock'] && stopnr < vars['poly_stop']) {
		window.alert(vars['poly_locktext']);
		return;
	}
	vars['poly_pointer'] = pointer;
	vars['poly_stop'] = stopnr;
	vars[optionvar + "_selected"] = true;
	vars[optionvar + "_last"] = true;
	vars[optionvar] = true;
	saveVars();
	loadBook(pointer, stopnr);
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
	console.log(fnid + " returns: " + dbgstr(ret));
	return ret;
}

// Below are all the tags shipped with Polyplot. You can make your own
// tags by just creating a function like one of these in the book.js file.

function tag_option(tagtext) {
	current_options.push(tagtext);
	return "";
}

function tag_options(tagtext) {
	vars['poly_stop'] = newStopNumber();
	vars['poly_pointer'] = thistaglocation;
	console.log("setting pointer to: " + thistaglocation);
	saveVars();
	var ret = "\n<!-- " + vars['poly_stop'] + " -->\n";
	ret += "<ul>\n"
	var got_one = false;
	current_options = [];
	var current_vars = [];
	polyParse(tagtext);
	current_options.forEach(function(option){
		var option_var = oneSplit(":", option)[0];
		if (vars[option_var + "_last"]) delete vars[option_var + "_last"];
	});
	current_options.forEach(function(option){
		var parts = oneSplit(":", option);
		var option_var = parts[0];
		var option_text = oneSplit("{", parts[1])[0];
		option = parts[1];
		var href = "javascript:clickOption('" + option_var.trim()
		  + "', " + thistaglocation + ", " + vars['poly_stop'] + ")";
		if (vars[option_var + "_selected"]) {
			got_one = true;
			ret += '<li class="selected">' + option_text + '</li>\n';
			vars[option_var + "_last"] = true;
			polyParse(option);
			delete vars[option_var + "_selected"];
		} else if (vars[option_var]) {
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

function tag_end(tagtext) {
	console.log("endtag");
	jumping = 'end';
	return "";
}

function tag_print(tagtext) {
	return doEval(tagtext);
}

function tag_anchor(tagtext) {
	return "";
}

function tag_jump(tagtext) {
	jumping = tagtext;
	vars[tagtext] = true;
	return "";
}

function tag_if(tagtext) {
	var parts = oneSplit(":", tagtext);
	last_if = doEval(parts[0]);
	if (last_if) {
		return polyParse(parts[1]);
	} else {
		return "";
	}
}

function tag_else(tagtext) {
	if (!last_if) {
		return polyParse(tagtext);
	} else {
		return "";
	}
}

function tag_lock(tagtext) {
	vars['poly_lock'] = true;
	vars['poly_locktext'] = tagtext;
	saveVars();
	return "";
}

function tag_unlock(tagtext) {
	vars['poly_lock'] = false;
	saveVars();
	return "";
}

function tag_unknown(tagtext) {
	doEval(tagtext);
	return "";
}
