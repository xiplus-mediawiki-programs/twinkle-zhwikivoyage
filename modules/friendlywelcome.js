//<nowiki>


(function($){


/*
 * vim: set noet sts=0 sw=8:
 ****************************************
 *** friendlywelcome.js: Welcome module
 ****************************************
 * Mode of invocation:     Tab ("Wel"), or from links on diff pages
 * Active on:              Existing user talk pages, diff pages
 * Config directives in:   FriendlyConfig
 */

Twinkle.welcome = function friendlywelcome() {
	if( Morebits.queryString.exists( 'friendlywelcome' ) ) {
		if( Morebits.queryString.get( 'friendlywelcome' ) === 'auto' ) {
			Twinkle.welcome.auto();
		} else {
			Twinkle.welcome.semiauto();
		}
	} else {
		Twinkle.welcome.normal();
	}
};

Twinkle.welcome.auto = function() {
	if( Morebits.queryString.get( 'action' ) !== 'edit' ) {
		// userpage not empty, aborting auto-welcome
		return;
	}

	Twinkle.welcome.welcomeUser();
};

Twinkle.welcome.semiauto = function() {
	Twinkle.welcome.callback( mw.config.get( 'wgTitle' ).split( '/' )[0].replace( /\"/, "\\\"") );
};

Twinkle.welcome.normal = function() {
	if( Morebits.queryString.exists( 'diff' ) ) {
		// check whether the contributors' talk pages exist yet
		var $oList = $("#mw-diff-otitle2").find("span.mw-usertoollinks a.new:contains(讨论)").first();
		var $nList = $("#mw-diff-ntitle2").find("span.mw-usertoollinks a.new:contains(讨论)").first();

		if( $oList.length > 0 || $nList.length > 0 ) {
			var spanTag = function( color, content ) {
				var span = document.createElement( 'span' );
				span.style.color = color;
				span.appendChild( document.createTextNode( content ) );
				return span;
			};

			var welcomeNode = document.createElement('strong');
			var welcomeLink = document.createElement('a');
			welcomeLink.appendChild( spanTag( 'Black', '[' ) );
			welcomeLink.appendChild( spanTag( 'Goldenrod', wgULS('欢迎', '歡迎') ) );
			welcomeLink.appendChild( spanTag( 'Black', ']' ) );
			welcomeNode.appendChild(welcomeLink);

			if( $oList.length > 0 ) {
				var oHref = $oList.attr("href");

				var oWelcomeNode = welcomeNode.cloneNode( true );
				oWelcomeNode.firstChild.setAttribute( 'href', oHref + '&' + Morebits.queryString.create( {
						'friendlywelcome': Twinkle.getFriendlyPref('quickWelcomeMode') === 'auto' ? 'auto': 'norm',
						'vanarticle': Morebits.pageNameNorm
					} ) );
				$oList[0].parentNode.parentNode.appendChild( document.createTextNode( ' ' ) );
				$oList[0].parentNode.parentNode.appendChild( oWelcomeNode );
			}

			if( $nList.length > 0 ) {
				var nHref = $nList.attr("href");

				var nWelcomeNode = welcomeNode.cloneNode( true );
				nWelcomeNode.firstChild.setAttribute( 'href', nHref + '&' + Morebits.queryString.create( {
						'friendlywelcome': Twinkle.getFriendlyPref('quickWelcomeMode') === 'auto' ? 'auto': 'norm',
						'vanarticle': Morebits.pageNameNorm
					} ) );
				$nList[0].parentNode.parentNode.appendChild( document.createTextNode( ' ' ) );
				$nList[0].parentNode.parentNode.appendChild( nWelcomeNode );
			}
		}
	}
	if( mw.config.get( 'wgNamespaceNumber' ) === 3 ) {
		var username = mw.config.get( 'wgTitle' ).split( '/' )[0].replace( /\"/, "\\\""); // only first part before any slashes
		Twinkle.addPortletLink( function(){ Twinkle.welcome.callback(username); }, wgULS("欢迎", "歡迎"), "friendly-welcome", wgULS("欢迎用户", "歡迎用戶") );
	}
};

Twinkle.welcome.welcomeUser = function welcomeUser() {
	Morebits.status.init( document.getElementById('bodyContent') );

	var params = {
		value: Twinkle.getFriendlyPref('quickWelcomeTemplate'),
		article: Morebits.queryString.exists( 'vanarticle' ) ? Morebits.queryString.get( 'vanarticle' ) : '',
		mode: 'auto'
	};

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = wgULS("欢迎完成，将在几秒钟后刷新", "歡迎完成，將在幾秒鐘後更新") ;

	var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), wgULS("用户讨论页修改", "用戶討論頁修改"));
	wikipedia_page.setFollowRedirect(true);
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.welcome.callbacks.main);
};

Twinkle.welcome.callback = function friendlywelcomeCallback( uid ) {
	if( uid === mw.config.get('wgUserName') && !confirm( wgULS('您确定要欢迎自己吗？…', '您確定要歡迎自己嗎？…') ) ){
		return;
	}

	var Window = new Morebits.simpleWindow( 600, 420 );
	Window.setTitle( wgULS("欢迎用户", "歡迎用戶") );
	Window.setScriptName( "Twinkle" );
	//Window.addFooterLink( "Welcoming Committee", "WP:WC" );
	Window.addFooterLink(wgULS("Twinkle帮助", "Twinkle幫助"), "W:WP:TW/DOC#welcome" );

	var form = new Morebits.quickForm( Twinkle.welcome.callback.evaluate );

	form.append({
			type: 'select',
			name: 'type',
			label: wgULS('欢迎的类型：', '歡迎的類型：'),
			event: Twinkle.welcome.populateWelcomeList,
			list: [
				{ type: 'option', value: 'standard', label: wgULS('常规欢迎模板', '正規歡迎模板'), selected: !Morebits.isIPAddress(mw.config.get('wgTitle')) },
				{ type: 'option', value: 'anonymous', label: wgULS('匿名用户欢迎模板', '匿名用户歡迎模板'), selected: Morebits.isIPAddress(mw.config.get('wgTitle')) },
				{ type: 'option', value: 'wikiProject', label: wgULS('远征队相关欢迎模板', '遠征隊相關歡迎模板') },
				{ type: 'option', value: 'nonChinese', label:  wgULS('非中文欢迎模板', '非中文歡迎模板') },
			]
		});

	form.append( { type: 'div', id: 'welcomeWorkArea' } );

	form.append( {
			type: 'input',
			name: 'article',
			label: wgULS('* 条目名（如模板支持）', '* 條目名（如模板支援）'),
			value:( Morebits.queryString.exists( 'vanarticle' ) ? Morebits.queryString.get( 'vanarticle' ) : '' ),
			tooltip: wgULS('如果模板支持，您可在此处加入一个条目名。支持的模板已用星号标记出来。', '如果模板支援，您可在此處加入一個條目名。支援的模板已用星號標記出來。')
		} );

	var previewlink = document.createElement( 'a' );
	$(previewlink).click(function(){
		Twinkle.welcome.callbacks.preview(result);  // |result| is defined below
	});
	previewlink.style.cursor = "pointer";
	previewlink.textContent = wgULS('预览', '預覽');
	form.append( { type: 'div', name: 'welcomepreview', label: [ previewlink ] } );

	form.append( { type: 'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	// initialize the welcome list
	var evt = document.createEvent( "Event" );
	evt.initEvent( 'change', true, true );
	result.type.dispatchEvent( evt );
};

Twinkle.welcome.populateWelcomeList = function(e) {
	var type = e.target.value;

	var container = new Morebits.quickForm.element({ type: "fragment" });

	if ((type === "standard" || type === "anonymous") && Twinkle.getFriendlyPref("customWelcomeList").length) {
		container.append({ type: 'header', label: wgULS('自定义欢迎模板', '自定義歡迎模板') });
		container.append({
			type: 'radio',
			name: 'template',
			list: Twinkle.getFriendlyPref("customWelcomeList"),
			event: Twinkle.welcome.selectTemplate
		});
	}

	var appendTemplates = function(list) {
		container.append({
			type: 'radio',
			name: 'template',
			list: list.map(function(obj) {
				var properties = Twinkle.welcome.templates[obj];
				var result = (properties ? {
					value: obj,
					label: "{{" + obj + "}}: " + properties.description + (properties.linkedArticle ? "\u00A0*" : ""),  // U+00A0 NO-BREAK SPACE
					tooltip: properties.tooltip  // may be undefined
				} : {
					value: obj,
					label: "{{" + obj + "}}"
				});
				return result;
			}),
			event: Twinkle.welcome.selectTemplate
		});
	};

	switch (type) {
		case "standard":
			container.append({ type: 'header', label: wgULS('常规欢迎模板', '正規歡迎模板') });
			appendTemplates([
				"welcome",
				"wikipedian"
			]);
			container.append({ type: 'header', label: wgULS('问题用户欢迎模板', '問題用戶歡迎模板') });
			appendTemplates([]);
			break;
		case "anonymous":
			container.append({ type: 'header', label: wgULS('匿名用户欢迎模板', '匿名用戶歡迎模板') });
			appendTemplates([
				"welcomeanon"
			]);
			break;
		case "wikiProject":
			container.append({ type: 'header', label: wgULS('远征队相关欢迎模板', '遠征隊相關歡迎模板') });
			appendTemplates([]);
			break;
		case "nonChinese":
			container.append({ type: 'header', label: wgULS('非中文欢迎模板', '非中文歡迎模板') });
			appendTemplates([
				"welcome-en"
			]);
			break;
		default:
			container.append({ type: 'div', label: wgULS('Twinkle.welcome.populateWelcomeList: 哪里出问题了', 'Twinkle.welcome.populateWelcomeList: 哪裡出問題了') });
			break;
	}

	var rendered = container.render();
	$(e.target.form).find("div#welcomeWorkArea").empty().append(rendered);

	var firstRadio = e.target.form.template[0] || e.target.form.template;
	firstRadio.checked = true;
	Twinkle.welcome.selectTemplate({ target: firstRadio });
};

Twinkle.welcome.selectTemplate = function(e) {
	var properties = Twinkle.welcome.templates[e.target.values];
	e.target.form.article.disabled = (properties ? !properties.linkedArticle : false);
};


// A list of welcome templates and their properties and syntax

// The four fields that are available are "description", "linkedArticle", "syntax", and "tooltip".
// The three magic words that can be used in the "syntax" field are:
//   - $USERNAME$  - replaced by the welcomer's username, depending on user's preferences
//   - $ARTICLE$   - replaced by an article name, if "linkedArticle" is true
//   - $HEADER$    - adds a level 2 header (most templates already include this)

Twinkle.welcome.templates = {
	// GENERAL WELCOMES

	"welcome": {
		description: wgULS("一般欢迎", "一般歡迎"),
		linkedArticle: false,
		syntax: "{{subst:welcome}}"
	},

	"wikipedian": {
		description: wgULS("欢迎维基百科人", "歡迎維基百科人"),
		linkedArticle: false,
		syntax: "{{subst:wikipedian}}"
	},

	"welcomeanon": {
		description: wgULS("欢迎匿名用户；鼓励注册账户", "歡迎匿名用戶；鼓勵註冊帳戶"),
		linkedArticle: false,
		syntax: "{{subst:welcomeanon}}"
	},

	"nonChinese": {
		description: wgULS("非中文欢迎", "非中文歡迎"),
		linkedArticle: false,
		syntax: "{{subst:welcome-en}}"
	}
};

Twinkle.welcome.getTemplateWikitext = function(template, article) {
	var properties = Twinkle.welcome.templates[template];
	if (properties) {
		return properties.syntax.
			replace("$USERNAME$", Twinkle.getFriendlyPref("insertUsername") ? mw.config.get("wgUserName") : "").
			replace("$ARTICLE$", article ? article : "").
			replace(/\$HEADER\$\s*/, wgULS("== 欢迎 ==\n\n", "== 歡迎 ==\n\n")).
			replace("$EXTRA$", "");  // EXTRA is not implemented yet
	} else {
		return "{{subst:" + template + (article ? ("|art=" + article) : "") + "}} ~~~~";
	}
};

Twinkle.welcome.callbacks = {
	preview: function(form) {
		var previewDialog = new Morebits.simpleWindow(750, 400);
		previewDialog.setTitle(wgULS("欢迎模板预览", "歡迎模板預覽"));
		previewDialog.setScriptName(wgULS("欢迎用户", "歡迎用戶"));
		previewDialog.setModality(true);

		var previewdiv = document.createElement("div");
		previewdiv.style.marginLeft = previewdiv.style.marginRight = "0.5em";
		previewdiv.style.fontSize = "small";
		previewDialog.setContent(previewdiv);

		var previewer = new Morebits.wiki.preview(previewdiv);
		previewer.beginRender(Twinkle.welcome.getTemplateWikitext(form.getChecked("template"), form.article.value));

		var submit = document.createElement("input");
		submit.setAttribute("type", "submit");
		submit.setAttribute("value", wgULS("关闭", "關閉"));
		previewDialog.addContent(submit);

		previewDialog.display();

		$(submit).click(function(e) {
			previewDialog.close();
		});
	},
	main: function( pageobj ) {
		var params = pageobj.getCallbackParameters();
		var text = pageobj.getPageText();

		// abort if mode is auto and form is not empty
		if( pageobj.exists() && params.mode === 'auto' ) {
			Morebits.status.info( wgULS('警告', '用户对话页非空，取消自动欢迎', '警告', '用戶對話頁非空，取消自動歡迎') );
			Morebits.wiki.actionCompleted.event();
			return;
		}

		var welcomeText = Twinkle.welcome.getTemplateWikitext(params.value, params.article);

		if( Twinkle.getFriendlyPref('topWelcomes') ) {
			text = welcomeText + '\n\n' + text;
		} else {
			text += "\n" + welcomeText;
		}

		var summaryText = wgULS("欢迎来到维基导游！", "歡迎來到維基導遊！");
		pageobj.setPageText(text);
		pageobj.setEditSummary(summaryText + Twinkle.getPref('summaryAd'));
		pageobj.setWatchlist(Twinkle.getFriendlyPref('watchWelcomes'));
		pageobj.setCreateOption('recreate');
		pageobj.save();
	}
};

Twinkle.welcome.callback.evaluate = function friendlywelcomeCallbackEvaluate(e) {
	var form = e.target;

	var params = {
		value: form.getChecked("template"),
		article: form.article.value,
		mode: 'manual'
	};

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( form );

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = wgULS("欢迎完成，将在几秒钟后刷新", "歡迎完成，將在幾秒鐘後更新");

	var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'),  wgULS("用户对话页修改", "用戶對話頁修改"));
	wikipedia_page.setFollowRedirect(true);
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.welcome.callbacks.main);
};
})(jQuery);


//</nowiki>
