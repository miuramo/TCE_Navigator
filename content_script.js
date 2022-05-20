var anchors = $('a[id^="label_"]');

//コースへのリンクを(あれば)集める
var courseHash = {};
var currentCourseId;

//フォーラムへのリンクを(あれば)集める
var forumHash = {};
var lastanchor = null;

//文例集へのリンクを(あれば)集める
var bunreiHash = {};
var lastbunrei = null;

const injectScript = (filePath, tag) => {
    var node = document.getElementsByTagName(tag)[0];
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', filePath);
    node.appendChild(script);
}


$(document).ready(function(){


    chrome.storage.sync.get(['courseHash'], function(res){
	var len = Object.keys(res.courseHash).length;
	//    console.log("load len: "+len);
	//    console.log(res.courseHash);

	courseHash = res.courseHash;

//	var len = Object.keys(courseHash).length;
//	console.log("before load: "+len);

	$.each(anchors, function(idx,val){
	    if (val.innerText.match(/^TCE-[2-9I].+$/)){
		courseHash[val.innerText] = val.href;
//		console.log(val.innerText);
//		console.log(val.href);    
	    }
	});
	chrome.storage.sync.set( {"courseHash": courseHash} );

	// フォーラムも集める
	var forums = $('a[class="aalink dimmed conditionalhidden"]');
	$.each(forums, function(idx,f){
	    if (f.href.match(/forum\/view.php/)){
		//console.log(f.baseURI+" "+f.innerText + " "+f.href);
		var flabel = f.innerText;
		var flabel2 = flabel.replace("連絡用フォーラム","");
		var flabel3 = flabel2.replace("査読者","");
		forumHash[flabel3] = f.href;
		lastanchor = f; // あとでbaseURI をつかうため
	    }
	    if (lastanchor !== null){ // フォーラムへのリンクがあったので
		// baseURIをそのままキーに使うと、長くて冗長なので、?id=のあとの数字だけ(XX)にしておき、forumXX とする。
		var cfkey = 'forum'+lastanchor.baseURI.replace("https://ipsjtce.org/course/view.php?id=","");
		var pair = {};
		pair[cfkey] = forumHash;
		chrome.storage.sync.set( pair );

	    }
	});


	// 文例集へのリンクも集める
	var buns = $('a[class="aalink"]');
	$.each(buns, function(idx,b){
	    if (b.href.match(/mod\/page\/view.php/)){
		if (b.innerText.match(/文例集/)){

		    var blabel = b.innerText;
		    if (bunreiHash[blabel] === undefined){
			bunreiHash[blabel] = b.href;
			lastbunrei = b; // あとでbaseURI をつかうため
			// console.log(b.baseURI+" "+b.innerText + " "+b.href);
		    }
		}
	    }
	    //	    console.log(bunreiHash);
	    
	    if (lastbunrei !== null){ // フォーラムへのリンクがあったので
		var regexb = /id=(\d+)/ ;
		if ( (myArray = regexb.exec(lastbunrei.baseURI)) !== null ){
		    var cfkey = "bunrei"+myArray[1];
		    // baseURIをそのままキーに使うと、長くて冗長なので、?id=のあとの数字だけ(XX)にしておき、bunreiXX とする。
		    //console.log(cfkey);
		    var pair = {};
		    pair[cfkey] = bunreiHash;
		    chrome.storage.sync.set( pair );
		}
	    }
	});


	// 連絡用フォーラムを開いている時は、コピペ用の文例を裏でロードする
	
	var title = $('title')[0].innerText;
	if (title.match(/連絡用フォーラム/)){
	    var type = title.replace("連絡用フォーラム","");
	    type = type.replace("第1","");
	    type = type.replace("第2","");
	    findBunrei(type, bunreiHash );
	}

	// location.href = /mod/forum/view.php?id=XXXX なら、フォーラム
	
    });
});

function findBunrei(type, bunHash){
    //    console.log("this is forum : " + type);

    //文例HashからURLをとってくるには、コースIDが必要。
    //コースIDを現在開いているフォーラムページから得るため、H1要素のTCE-2X-XXXXを取得し、
    //courseHash からコースTopURLを所得。最後の数字部分のみを抽出=>courseId
    var h1 = $('h1')[0];
    // console.log("H1 "+h1.innerText);
    var courseId = courseHash[h1.innerText].replace("https://ipsjtce.org/course/view.php?id=","");
    // console.log("CourseID: "+courseId);
    
    var cbkey = 'bunrei'+courseId;
    // console.log('文例集のキー: '+cbkey);
    chrome.storage.sync.get( cbkey, function(res){
	var tmpbHash = res[cbkey];
	$.each(tmpbHash, function(buntitle,bunurl){
//	    console.log(buntitle+" "+bunurl);
	    //どの文例集か、現在開いているフォーラムのtype(メタ査読者、査読者、著者)をつかってマッチする
	    var regex = new RegExp("^"+type);
	    if (buntitle.match(regex)){
		console.log(buntitle+" :"+bunurl);
		
		loadBunrei(bunurl, type); //typeは本来不要だが、査読者文例の最初の2つを繋げたいため渡している

		
	    }
	});
    });
    
}

// 文例をいれておくHash
var CopyBunHash = {};

// 文例を読み込んでコピーボタンを作成する
function loadBunrei(bunurl, type){
    console.log("load bunrei "+bunurl);

    injectScript(chrome.runtime.getURL('war.js'), 'body');
    
    $.get(bunurl, {}, function(data){
	var pres = $(data).find('pre'); //現状ではpreタグのみを取り出している
	var ttitle = "論文査読のお願い";
//	var count = 0;
//	var tmptxt = "";
	$.each(pres,function(i,el){
	    var txt = el.innerText;
	    if (txt.match(/件名/) && txt.length < 100 || txt.match(/トピックタイトル/)  ){
		ttitle = txt;
		ttitle = ttitle.replace("件名：","");
		ttitle = ttitle.replace("トピックタイトル：","");
	    } else {
/*		if (type=="査読者" && count==0){
		    tmptxt = txt;
		    count++;
		} else if (type=="査読者" && count==1){
		    txt = tmptxt + txt;
		} else {*/
		var btitle = ttitle+"("+txt.length+")";
		console.log("【"+btitle+"】"+"\n"+txt);
		$('#btndiv').append("<button class='xsm cbutton'>"+btitle+"</button> ");
		CopyBunHash[btitle] = txt;
		
		ttitle = "論文査読のお願い";
//		count++;
//		}
	    }
	});
	$('#btndiv').append("<input id='addpretag' type='checkbox' checked='checked'><label for='addpretag' class='xsm'>Preタグ追加</label> ");
	$('#btndiv').append("<br><pre id='bunprev' class='bunprev'></pre> ");
	// hover
	$('.cbutton').on('click', cclick);
	$('.cbutton').on('mouseover', cover);
	$('.cbutton').on('mouseleave', cleave);

    });
    
}

function cclick(){
    var bkey = $(this)[0].innerText;
    var doaddpretag = $('#addpretag').prop("checked");
    var txt = CopyBunHash[bkey];
    if (doaddpretag){
	txt = '<pre dir="ltr" style="text-align: left; font-size: 14px;">'+txt+'</pre>';
    }
    copyTextToClipboard(txt);
    $('#bunprev').text("");
}
function cover(){
    var bkey = $(this)[0].innerText;
    $('#bunprev').text( CopyBunHash[bkey] );
}
function cleave(){
    $('#bunprev').text("");
}

function copyTextToClipboard(text) {
  var copyTA = document.createElement("textarea");
  copyTA.textContent = text;
  document.body.appendChild(copyTA);
  copyTA.select();
  document.execCommand('copy');
  copyTA.blur();
  document.body.removeChild(copyTA);
}
