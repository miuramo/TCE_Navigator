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

// 必要に応じて、war.js を読み込むための関数
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

	courseHash = res.courseHash;


	$.each(anchors, function(idx,val){
	    if (val.innerText.match(/^TCE-[2-9I].+$/)){
		courseHash[val.innerText] = val.href;
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


	// 連絡用フォーラムの一覧ページを開いている時は、コピペ用の文例を裏でロードする
	
	var title = $('title')[0].innerText;
	if (title.match(/連絡用フォーラム/)){
	    var type = title.replace("連絡用フォーラム","");
	    type = type.replace("第1","");
	    type = type.replace("第2","");
	    findBunrei(type, bunreiHash );
	} else {

//    /mod/forum/discuss.php フォーラムの詳細を開いているときも、コピペ用の文例を裏でロードする
	    var h2 = $('h2');
//	    console.log($(h2));
	    var h2t = h2[0].innerText;
//	    console.log(h2t);
	    if (h2t.match(/連絡用フォーラム/)){
		h2t = h2t.replace("連絡用フォーラム","");
		h2t = h2t.replace("第1","");
		h2t = h2t.replace("第2","");
		findBunrei(h2t, bunreiHash );
	    }
	}
	
	
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
    //    console.log("CourseID: "+courseId+"  Type: "+type);
    
    var cbkey = 'bunrei'+courseId;
    // console.log('文例集のキー: '+cbkey);
    chrome.storage.sync.get( cbkey, function(res){
	var tmpbHash = res[cbkey];
	$.each(tmpbHash, function(buntitle,bunurl){
	    // console.log("Each: "+buntitle+" "+bunurl);
	    //どの文例集か、現在開いているフォーラムのtype(メタ査読者、査読者、著者)をつかってマッチする
	    var regex = new RegExp("^"+type);
	    if (buntitle.match(regex)){
		// console.log("実際に読み込む："+buntitle+" :"+bunurl);
		
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
	$.each(pres,function(i,el){
	    var txt = el.innerText;
	    if ( ( txt.match(/件名/) || txt.match(/トピックタイトル/)) && txt.length < 100 ){
		ttitle = txt;
		ttitle = ttitle.replace("件名：","");
		ttitle = ttitle.replace("トピックタイトル：","");
	    } else {
		var btitle = ttitle+"("+txt.length+")";
		$('#btndiv').append("<button class='xsm cbutton'>"+btitle+"</button> ");
		CopyBunHash[btitle] = txt;
		
		ttitle = "論文査読のお願い";
	    }
	});
	$('#btndiv').append("<input id='addpretag' type='checkbox' > <label for='addpretag' class='xsm'>Preタグ追加</label> ");
	$('#btndiv').append("<a href='"+bunurl+"' target='_blank' class='xsm'>元の文例</a> ");
	$('#btndiv').append("<br><pre id='bunprev' class='bunprev'></pre> ");
	// hover
	$('.cbutton').on('click', cclick);
	$('.cbutton').on('mouseover', cover);
	$('.cbutton').on('mouseleave', cleave);
	$('.cbutton').on('mousemove', cmove);
	$('#btndiv').css("opacity",1.0);

    });
    
}

const pretag_custom_begin = '<pre dir="ltr" style="text-align: left; font-size: 14px;">';
const pretag_custom_end = '</pre>';

function cclick(event){
    var bkey = $(this)[0].innerText;
    var doaddpretag = $('#addpretag').prop("checked");
    var txt = CopyBunHash[bkey];
    if (doaddpretag){ // Preタグ追加チェックボックスがONのとき
	txt = (pretag_custom_begin + txt + pretag_custom_end) ; //ここの前で定義したPreタグで囲む
    }
    copyTextToClipboard(txt);

    $('#bunprev').css("background","rgba(10,240,240,0.8)").fadeOut(2500);
    $('#tooltip').fadeIn(300).delay(1000).fadeOut(2000);
    cmove(event);
    
}
function cover(){
    var bkey = $(this)[0].innerText;
    $('#bunprev').text( CopyBunHash[bkey] );
    $('#bunprev').css("background","rgba(240,240,200,0.8)");
    $('#bunprev').css("opacity",1.0).fadeIn();
}
function cleave(){
    $('#bunprev').css("background","rgba(240,240,200,0.8)");
    $('#bunprev').css("opacity",0.0);
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

function cmove(event){
    var mx = event.pageX + 20;
    var my = event.pageY + 5 ;
    $('#tooltip').offset({"top": my, "left":mx});
}
