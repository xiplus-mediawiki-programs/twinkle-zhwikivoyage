//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinklexfd.js: XFD module
 ****************************************
 * Mode of invocation:     Tab ("XFD")
 * Active on:              Existing, non-special pages, except for file pages with no local (non-Commons) file which are not redirects
 * Config directives in:   TwinkleConfig
 */

Twinkle.xfd = function twinklexfd() {
	// Disable on:
	// * special pages
	// * non-existent pages
	// * files on Commons, whether there is a local page or not (unneeded local pages of files on Commons are eligible for CSD F2)
	// * file pages without actual files (these are eligible for CSD G8)
	if ( mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId') || (mw.config.get('wgNamespaceNumber') === 6 && (document.getElementById('mw-sharedupload') || (!document.getElementById('mw-imagepage-section-filehistory') && !Morebits.wiki.isPageRedirect()))) ) {
		return;
	}
	Twinkle.addPortletLink( Twinkle.xfd.callback, wgULS("提删", "提刪"), "tw-xfd", wgULS("提交删除表决", "提交刪除表決") );
};

Twinkle.xfd.currentRationale = null;

// error callback on Morebits.status.object
Twinkle.xfd.printRationale = function twinklexfdPrintRationale() {
	if (Twinkle.xfd.currentRationale) {
		Morebits.status.printUserText(Twinkle.xfd.currentRationale, wgULS("您的理由已在下方提供，如果您想重新提交，请将其复制到一新窗口中：", "您的理由已在下方提供，如果您想重新提交，請將其複製到一新窗口中："));
		// only need to print the rationale once
		Twinkle.xfd.currentRationale = null;
	}
};

Twinkle.xfd.callback = function twinklexfdCallback() {
	var Window = new Morebits.simpleWindow( 600, 350 );
	Window.setTitle( wgULS("提交删除表决", "提交刪除表決") );
	Window.setScriptName( "Twinkle" );
	Window.addFooterLink( wgULS("关于删除表决", "關於刪除表決"), "WV:VFD" );
	Window.addFooterLink( wgULS("Twinkle帮助", "Twinkle幫助"), "w:WP:TW/DOC#xfd" );

	var form = new Morebits.quickForm( Twinkle.xfd.callback.evaluate );
	var categories = form.append( {
			type: 'select',
			name: 'category',
			label: wgULS('提交类型：', '提交類型：'),
			event: Twinkle.xfd.callback.change_category
		} );
	categories.append( {
			type: 'option',
			label: wgULS('删除表决', '刪除表決'),
			selected: true,
			value: 'vfd'
		} );
	form.append( {
			type: 'checkbox',
			list: [
				{
					label: wgULS('如果可能，通知页面创建者', '如果可能，通知頁面創建者'),
					value: 'notify',
					name: 'notify',
					tooltip: wgULS("在页面创建者对话页上放置一通知模板。", "在頁面創建者對話頁上放置一通知模板。"),
					checked: true
				}
			]
		}
	);
	form.append( {
			type: 'field',
			label:wgULS('工作区', '工作區'),
			name: 'work_area'
		} );
	form.append( { type:'submit' } );

	var result = form.render();
	Window.setContent( result );
	Window.display();

	// We must init the controls
	var evt = document.createEvent( "Event" );
	evt.initEvent( 'change', true, true );
	result.category.dispatchEvent( evt );
};

Twinkle.xfd.previousNotify = true;

Twinkle.xfd.callback.change_category = function twinklexfdCallbackChangeCategory(e) {
	var value = e.target.value;
	var form = e.target.form;
	var old_area = Morebits.quickForm.getElements(e.target.form, "work_area")[0];
	var work_area = null;

	var oldreasontextbox = form.getElementsByTagName('textarea')[0];
	var oldreason = (oldreasontextbox ? oldreasontextbox.value : '');

	var appendReasonBox = function twinklexfdAppendReasonBox() {
		work_area.append( {
			type: 'textarea',
			name: 'xfdreason',
			label: '理由：',
			value: oldreason,
			tooltip: wgULS('您可以使用维基格式，Twinkle将自动为您加入签名。', '您可以使用維基格式，Twinkle將自動為您加入簽名。 ')
		} );
		// TODO possible future "preview" link here
	};

	switch( value ) {
	case 'vfd':
		work_area = new Morebits.quickForm.element( {
				type: 'field',
				label: wgULS('删除表决', '刪除表決'),
				name: 'work_area'
			} );
		work_area.append( {
				type: 'checkbox',
				list: [
						{
							label: wgULS('使用<noinclude>包裹模板', '使用<noinclude>包裹模板'),
							value: 'noinclude',
							name: 'noinclude',
							checked: mw.config.get('wgNamespaceNumber') === 10, // Template namespace
							tooltip: wgULS('使其不会在被包含时出现。', '使其不會在被包含時出現。 ')
						}
					]
		} );
		appendReasonBox();
		work_area = work_area.render();
		old_area.parentNode.replaceChild( work_area, old_area );
		break;
	default:
		work_area = new Morebits.quickForm.element( {
				type: 'field',
				label: wgULS('未定义', '未定義'),
				name: 'work_area'
			} );
		work_area = work_area.render();
		old_area.parentNode.replaceChild( work_area, old_area );
		break;
	}

	// No creator notification for CFDS
	if (true) {
		Twinkle.xfd.previousNotify = form.notify.checked;
		form.notify.checked = false;
		form.notify.disabled = true;
	} else {
		form.notify.checked = Twinkle.xfd.previousNotify;
		form.notify.disabled = false;
	}
};

Twinkle.xfd.callbacks = {
	vfd: {
		main: function(pageobj) {
			// this is coming in from lookupCreator...!
			var params = pageobj.getCallbackParameters();
			//var initialContrib = pageobj.getCreator();
			//params.uploader = initialContrib;

			// Adding discussion
			wikipedia_page = new Morebits.wiki.page(params.logpage, wgULS("添加讨论到当日列表", "添加討論到當日列表"));
			wikipedia_page.setFollowRedirect(true);
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.xfd.callbacks.vfd.todaysList);

			// Notification to first contributor
			if(false && params.usertalk) {
				// Disallow warning yourself
				if (initialContrib === mw.config.get('wgUserName')) {
					pageobj.getStatusElement().warn("您（" + initialContrib + wgULS("）创建了该页，跳过通知", "）創建了該頁，跳過通知"));
					return;
				}

				var usertalkpage = new Morebits.wiki.page('User talk:' + initialContrib, wgULS("通知页面创建者（", "通知頁面創建者（") + initialContrib + "）");
				var notifytext = "\n{{subst:idw|File:" + mw.config.get('wgTitle') + "}}--~~~~";
				usertalkpage.setAppendText(notifytext);
				usertalkpage.setEditSummary(wgULS("通知：页面[[", "通知：頁面[[") + Morebits.pageNameNorm + wgULS("]]删除表决提名", "]]刪除表決提名") + Twinkle.getPref('summaryAd'));
				usertalkpage.setCreateOption('recreate');
				switch (Twinkle.getPref('xfdWatchUser')) {
					case 'yes':
						usertalkpage.setWatchlist(true);
						break;
					case 'no':
						usertalkpage.setWatchlistFromPreferences(false);
						break;
					default:
						usertalkpage.setWatchlistFromPreferences(true);
						break;
				}
				usertalkpage.setFollowRedirect(true);
				usertalkpage.append();
			}
		},
		tagging: function(pageobj) {
			if (!pageobj.exists()) {
				statelem.error(wgULS("页面不存在，可能已被删除", "頁面不存在，可能已被刪除"));
				return;
			}
			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();
			var tag = '{{vfd}}';
			if ( params.noinclude ) {
				tag = '<noinclude>' + tag + '</noinclude>';
			} else {
				tag += '\n';
			}

			// Then, test if there are speedy deletion-related templates on the article.
			var textNoSd = text.replace(/\{\{\s*(db(-\w*)?|d|delete|(?:hang|hold)[\- ]?on)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/ig, "");
			if (text !== textNoSd && confirm(wgULS("在页面上找到快速删除模板，要移除吗？", "在頁面上找到快速刪除模板，要移除嗎？"))) {
				text = textNoSd;
			}

			// Mark the page as patrolled, if wanted
			if (Twinkle.getPref('markXfdPagesAsPatrolled')) {
				pageobj.patrol();
			}

			pageobj.setPageText(tag + text);
			pageobj.setEditSummary(wgULS("删除表决：[[", "刪除表決：[[") + params.logpage + "#" + Morebits.pageNameNorm + "]]" + Twinkle.getPref('summaryAd'));
			switch (Twinkle.getPref('xfdWatchPage')) {
				case 'yes':
					pageobj.setWatchlist(true);
					break;
				case 'no':
					pageobj.setWatchlistFromPreferences(false);
					break;
				default:
					pageobj.setWatchlistFromPreferences(true);
					break;
			}
			// pageobj.setCreateOption('recreate');
			pageobj.save();

			if( Twinkle.getPref('markXfdPagesAsPatrolled') ) {
				pageobj.patrol();
			}
		},
		todaysList: function(pageobj) {
			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();

			pageobj.setAppendText("\n\n== [[:" + Morebits.pageNameNorm + "]] ==\n" + Morebits.string.formatReasonText(params.reason) + "--~~~~");
			pageobj.setEditSummary("添加[[" + Morebits.pageNameNorm + "]]" + Twinkle.getPref('summaryAd'));
			switch (Twinkle.getPref('xfdWatchDiscussion')) {
				case 'yes':
					pageobj.setWatchlist(true);
					break;
				case 'no':
					pageobj.setWatchlistFromPreferences(false);
					break;
				default:
					pageobj.setWatchlistFromPreferences(true);
					break;
			}
			pageobj.setCreateOption('recreate');
			pageobj.append(function() {
				Twinkle.xfd.currentRationale = null;  // any errors from now on do not need to print the rationale, as it is safely saved on-wiki
			});
		}
	}
};



Twinkle.xfd.callback.evaluate = function(e) {
	var type = e.target.category.value;
	var usertalk = false && e.target.notify.checked;
	var reason = e.target.xfdreason.value;
	var noinclude = e.target.noinclude.checked;

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( e.target );

	Twinkle.xfd.currentRationale = reason;
	Morebits.status.onError(Twinkle.xfd.printRationale);

	if( !type ) {
		Morebits.status.error( wgULS('错误', '錯誤'), wgULS('未定义的动作', '未定義的動作') );
		return;
	}

	var query, wikipedia_page, wikipedia_api, logpage, params;
	switch( type ) {

	case 'vfd': // VFD
		logpage = wgULS('wikivoyage:删除表决', 'wikivoyage:刪除表決');
		params = { usertalk: usertalk, noinclude: noinclude, reason: reason, logpage: logpage };

		Morebits.wiki.addCheckpoint();
		// Updating data for the action completed event
		Morebits.wiki.actionCompleted.redirect = logpage;
		Morebits.wiki.actionCompleted.notice = wgULS("提名完成，重定向到讨论页", "提名完成，重定向到討論頁");

		// Tagging page
		wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), wgULS("添加删除表决模板到页面", "添加刪除表決模板到頁面"));
		wikipedia_page.setFollowRedirect(false);
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.load(Twinkle.xfd.callbacks.vfd.tagging);

		// Contributor specific edits
		wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'));
		wikipedia_page.setCallbackParameters(params);
		wikipedia_page.lookupCreator(Twinkle.xfd.callbacks.vfd.main);

		Morebits.wiki.removeCheckpoint();
		break;

	default:
		alert(wgULS("twinklexfd：未定义的类别", "twinklexfd：未定義的類別"));
		break;
	}
};
})(jQuery);


//</nowiki>
