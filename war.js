// inject to content

// is Forum?

// Inject progress bars

var btndiv = document.createElement("header");
btndiv.id = "btndiv"; btndiv.className = "top_fixed";
btndiv.innerHTML = "<span class='xsm'>ボタンをクリックすると、文例をコピーします。</span> ";
$('body').append(btndiv);


var tooltip = document.createElement("div");
tooltip.id = "tooltip"; tooltip.className = "ctooltip";
tooltip.innerHTML = "Copied!!";
$('body').append(tooltip);
$('#tooltip').fadeOut(1);

jQuery(function($){
    var _window = $(window),
	_header = $('#btndiv'),
	heroBottom,
	startPos,
	winScrollTop;
    
    _window.on('scroll',function(){
	winScrollTop = $(this).scrollTop();
	heroBottom = 50; //$('.hero').height();
	if (winScrollTop >= startPos) {
	    if(winScrollTop >= heroBottom){
		_header.addClass('hide');
	    }
	} else {
	    _header.removeClass('hide');
	}
	startPos = winScrollTop;
    });
    
    _window.trigger('scroll');	
});



