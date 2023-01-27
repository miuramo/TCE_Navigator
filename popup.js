// コース情報
// TCE-XX-XXXX => https://ipsjtce.org/course/view.php?id=YY のハッシュ
var courseHash = {};

var starHash = {}; //スターをつける "00XX"=>"color of star"

var kwd = ""; // サーチエリアのテキスト

$(window).on('load', function () {
	chrome.storage.sync.get(['starHash'], function (res) {
		if (res.starHash === undefined) {
			chrome.storage.sync.set({ "starHash": {} });
		} else {
			starHash = res.starHash;
			logobj(starHash);
		}
	});

	chrome.storage.sync.get(['courseHash'], function (res) {
		courseHash = res.courseHash;

		// 初回起動で、まだコース情報がない→空のデータを作成し、ダッシュボードにログイン
		if (courseHash === undefined) {
			chrome.storage.sync.set({ "courseHash": {} });
			var h = "https://ipsjtce.org/my/";
			chrome.tabs.create({ url: h });
		} else {
			// キーワードをstorageから読み込み、Popup pageをアップデート
			loadKwd();
		}
	});

	chrome.storage.sync.get(['isopentab'], function (res) {
		if (res.isopentab === undefined) {
			chrome.storage.sync.set({ "isopentab": true });
		} else {
			$('#isopentab').prop("checked", res.isopentab);
		}
	});

	// プリセットされた星の色
	const preset_stars = ['#ffd700', '#f0e68c', '#ffe4b5', '#ffc0cb', '#d8bfd8', '#afeeee', '#98fb98', '#66cdaa', '#00bfff'];
	$.each(preset_stars, function (idx, val) {
		$('#presetstars').append(getHtml_PresetColorStar(val));
	});


	document.querySelector('.inputclear').addEventListener('click', inputclear);
	document.querySelector('.allcacheclear').addEventListener('click', allcacheclear);
	document.querySelector('.thesecacheclear').addEventListener('click', thesecacheclear);
});

function process_link() {
	var aurl = $(this).attr('href');
	if ($('#isopentab').prop("checked")) {
		chrome.tabs.create({ url: aurl });
	} else {
		chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
			var tab = tabs[0];
			chrome.tabs.update(tab.id, { url: aurl });
		});
	}
	return false;
}

$(document).ready(function () {
	// リンクを別タブで
	$('body').on('click', 'a', process_link);

	// サーチテキストエリアにフォーカス
	$('#search').focus();

});

function saveKwd() {
	chrome.storage.sync.set({ "lastKwd": kwd });
}

// キーワードをstorageから読み込み、Popup pageをアップデート
function loadKwd() {
	chrome.storage.sync.get(['lastKwd'], function (r) {
		kwd = r.lastKwd;
		$('#search').val(kwd);
		updateList();
	});
}

function updateList() {
	$('#cstarul').empty();
	// starHashのキーをソートする
	var keys = Object.keys(starHash);
	keys.sort(); // ソート順に表示する
	for (i = 0; i < keys.length; i++) {
		var ordk = keys[i];
		$('#cstarul').append(getDiveHtml(ordk));
	}


	$('#clistul').empty();
	var regex = new RegExp(kwd);

	var count = 0;
	var course = "";
	var href = "";
	$.each(courseHash, function (idx, val) {
		if (idx.toUpperCase().match(regex) || kwd.length == 0) {
			// この段階では、display:none にしておく
			$('#clistul').append("<li><a href=\"" + val + "\">" + idx + "</a> " + getDiveHtml(idx.slice(-7)) + " " + getStarHtml(idx) + "<ul id=\"c" + idx + "\" style=\"display:none;\"></ul> </li>");
			count++;
			course = idx;
			href = val;
		}
	});
	$('.cdive').on('click', divein);
	$('.cstar').on('click', unstarclk);
	$('.cunstar').on('click', starclk);

	$('.ccstar').on('click', colorstarclk);

	if (count < 5) { //4つ以下に絞り込めた

		$.each(courseHash, function (course, href) {
			if (course.toUpperCase().match(regex)) {
				// コース編集URL view->edit
				var editurl = href.replace("view", "edit");
				var userurl = href.replace("course/view", "user/index");

				$('#c' + course).css("display", "inline-block");

				$('#c' + course).append("<li><a href=\"" + editurl + "\">コース編集</a> &nbsp; <a href=\"" + userurl + "\">ユーザ編集</a></li>");
				var sechash = {
					"#section-1": "投稿原稿",
					"#section-2": "著者連絡",
					"#section-3": "判定結果",
					"#section-4": "編集委員会",
					"#section-5": "幹事",
					"#section-6": "メタ査読者",
					"#section-7": "査読者"
				};
				var sectxt = "";
				var tmpcount = 0;
				$.each(sechash, function (idx, val) {
					sectxt += "<a href=\"" + href + idx + "\">" + val + "</a> &nbsp; ";
					if (tmpcount == 2) sectxt += "<br>";
					tmpcount++;
				});
				$('#c' + course).append("<li>" + sectxt + "</li>");

				// さらに、フォーラムをチェック
				var cfkey = 'forum' + href.replace("https://ipsjtce.org/course/view.php?id=", "");
				chrome.storage.sync.get(cfkey, function (res) {
					var tmpfHash = res[cfkey];
					var txt = "";
					$.each(tmpfHash, function (key, val) {
						txt += "<a href=\"" + val + "\">" + key + "</a> &nbsp; ";
					});
					if (txt.length > 10) {
						$('#c' + course).append("<li>フォーラム：" + txt + "</li>");
					} else {
						$('#c' + course).append("<li>いちど <a href=\"" + href + "\">コースを表示</a> すると、ここにフォーラムへの直リンクを表示します</li>");
					}
				});

				// さらに、文例集をチェック
				var cbkey = 'bunrei' + href.replace("https://ipsjtce.org/course/view.php?id=", "");
				chrome.storage.sync.get(cbkey, function (res) {
					var tmpbHash = res[cbkey];
					var txt = "";
					$.each(tmpbHash, function (key, val) {
						key = key.replace("連絡用文例集", "");
						key = key.replace("ページ", "");
						txt += "<a href=\"" + val + "\">" + key + "</a> &nbsp; ";
					});
					if (txt.length > 10) {
						// $('#c'+course).append("<li>文例："+txt+"</li>");
					}
				});
			}
		});
	}
}

$('#search').on('keyup', function (e) {
	var val = $(this).val();
	kwd = val;
	if (e.keyCode == 16 || e.keyCode == 17 || e.keyCode == 18 || e.keyCode == 91) { // SHIFT or Cmd or Alt
		var isopen = $('#isopentab').prop("checked");
		$('#isopentab').prop("checked", !isopen);
		chrome.storage.sync.set({ "isopentab": !isopen });
	} else {
		updateList();
		saveKwd();
	}
});

$('#isopentab').on('change', function (e) {
	var isopen = $('#isopentab').prop("checked");
	chrome.storage.sync.set({ "isopentab": isopen });
});

$('body').on('keydown'), function (e) {
	if (e.which == 'Q'.charCodeAt(0)) {
		inputclear();
	}
}

// for Debug
function logobj(obj) {
	$.each(obj, function (idx, val) {
		console.log(idx + " " + val);
	});
}

// 星をつける。cn4: コース名末尾4文字, type : 星の色
// if type is null, delete
function addStar(cn4, type) {
	if (type !== null) starHash[cn4] = type;
	else delete starHash[cn4];
	chrome.storage.sync.set({ "starHash": starHash });
}

// course: 長いコース名(TCE-22-XXXX)
function getStarHtml(course) {
	var cn4 = course.slice(-7);
	// cn4: コース名末尾4桁
	if (starHash[cn4]) { // スターがついている
		return "<span id=\"star" + cn4 + "\" class=\"cstar\" title=\"click to unstar\" style=\"color:" + starHash[cn4] + "\">★</span>";
	} else {
		return "<span id=\"unstar" + cn4 + "\" class=\"cunstar\" title=\"click to star\" >☆</span>";
	}
}

// プリセットされた星の色設定ボタン
function getHtml_PresetColorStar(color) {
	return "<span id=\"ccstar\" class=\"ccstar\" style=\"color:" + color + "\" >★</span>";
}
// デフォルトの色選択星をクリックしたとき、ColorChooserに設定
function colorstarclk(e) {
	var scolor = e.currentTarget.style.color;
	$('#colorofstar').val(rgbTo16(scolor));
}
// rgb(nnn,nnn,nnn) => #rrggbb 形式に変換
function rgbTo16(col) {
	return "#" + col.match(/\d+/g).map(function (a) { return ("0" + parseInt(a).toString(16)).slice(-2) }).join("");
}


// cn4: コース名末尾4桁
function getDiveHtml(cn4) {
	if (starHash[cn4])
		return "<button class='cdive cdstar' style='background: " + starHash[cn4] + ";'>" + cn4 + "</button> ";
	else
		return "<button class='cdive' >" + cn4 + "</button> ";
}

// 検索中キャッシュのクリア
function thesecacheclear() {
	// delete courseHash
	var regex = new RegExp(kwd);
	$.each(courseHash, function (course, href) {
		if (course.toUpperCase().match(regex)) {
			delete courseHash[course];
		}
	});
	chrome.storage.sync.set( {"courseHash": courseHash} ); //削除したコースハッシュを保存

	delete starHash[kwd];
	chrome.storage.sync.set({ "starHash": starHash });
	console.log("キャッシュを削除しました");
	$('#search').val("");
	kwd = "";
	updateList();
}

// 全キャッシュのクリア
function allcacheclear() {
	var ok = confirm("本当にすべてのキャッシュを削除してよいですか？");
	if (ok == true) {
		chrome.storage.sync.clear(function () {
			var error = chrome.runtime.lastError;
			if (error) {
				console.error(error);
			}
			console.log("キャッシュを削除しました");
		});
	}
}


function inputclear() {
	//    var val = $('#search').val();
	//    if (courseHash[val]===undefined) addStar(val,null);
	$('#search').val("");
	kwd = "";
	updateList();
	saveKwd();
}
function divein(e) {
	var btxt = e.currentTarget.innerText;
	if (kwd == btxt) { inputclear(); return }
	kwd = btxt;
	$('#search').val(kwd);
	saveKwd();
	updateList();
}

// 星をクリックしてスターをつける
function starclk(e) {
	var sn = e.currentTarget.id;
	var hosicolor = $('#colorofstar').val();
	addStar(sn.slice(-7), hosicolor); //add star
	updateList();

	//
}
// 星をクリックしてスターを消す
function unstarclk(e) {
	var sn = e.currentTarget.id;
	addStar(sn.slice(-7), null); //delete star
	updateList();

}

