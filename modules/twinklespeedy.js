//<nowiki>
// vim: set noet sts=0 sw=8:


(function($){


/*
 ****************************************
 *** twinklespeedy.js: CSD module
 ****************************************
 * Mode of invocation:     Tab ("CSD")
 * Active on:              Non-special, existing pages
 * Config directives in:   TwinkleConfig
 *
 * NOTE FOR DEVELOPERS:
 *   If adding a new criterion, add it to the appropriate places at the top of
 *   twinkleconfig.js.  Also check out the default values of the CSD preferences
 *   in twinkle.js, and add your new criterion to those if you think it would be
 *   good.
 */

Twinkle.speedy = function twinklespeedy() {
	// Disable on:
	// * special pages
	// * non-existent pages
	if (mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId')) {
		return;
	}

	Twinkle.addPortletLink( Twinkle.speedy.callback, "速删", "tw-csd", Morebits.userIsInGroup('sysop') ? "快速删除" : "请求快速删除" );
};

// This function is run when the CSD tab/header link is clicked
Twinkle.speedy.callback = function twinklespeedyCallback() {
	Twinkle.speedy.initDialog(Morebits.userIsInGroup( 'sysop' ) ? Twinkle.speedy.callback.evaluateSysop : Twinkle.speedy.callback.evaluateUser, true);
};

// Used by unlink feature
Twinkle.speedy.dialog = null;

// The speedy criteria list can be in one of several modes
Twinkle.speedy.mode = {
	sysopSubmit: 1,  // radio buttons, no subgroups, submit when "Submit" button is clicked
	sysopRadioClick: 2,  // radio buttons, no subgroups, submit when a radio button is clicked
	userMultipleSubmit: 3,  // check boxes, subgroups, "Submit" button already pressent
	userMultipleRadioClick: 4,  // check boxes, subgroups, need to add a "Submit" button
	userSingleSubmit: 5,  // radio buttons, subgroups, submit when "Submit" button is clicked
	userSingleRadioClick: 6,  // radio buttons, subgroups, submit when a radio button is clicked

	// are we in "delete page" mode?
	// (sysops can access both "delete page" [sysop] and "tag page only" [user] modes)
	isSysop: function twinklespeedyModeIsSysop(mode) {
		return mode === Twinkle.speedy.mode.sysopSubmit ||
			mode === Twinkle.speedy.mode.sysopRadioClick;
	},
	// do we have a "Submit" button once the form is created?
	hasSubmitButton: function twinklespeedyModeHasSubmitButton(mode) {
		return mode === Twinkle.speedy.mode.sysopSubmit ||
			mode === Twinkle.speedy.mode.userMultipleSubmit ||
			mode === Twinkle.speedy.mode.userMultipleRadioClick ||
			mode === Twinkle.speedy.mode.userSingleSubmit;
	},
	// is db-multiple the outcome here?
	isMultiple: function twinklespeedyModeIsMultiple(mode) {
		return mode === Twinkle.speedy.mode.userMultipleSubmit ||
			mode === Twinkle.speedy.mode.userMultipleRadioClick;
	},
	// do we want subgroups? (if not we have to use prompt())
	wantSubgroups: function twinklespeedyModeWantSubgroups(mode) {
		return !Twinkle.speedy.mode.isSysop(mode);
	}
};

// Prepares the speedy deletion dialog and displays it
Twinkle.speedy.initDialog = function twinklespeedyInitDialog(callbackfunc) {
	var dialog;
	Twinkle.speedy.dialog = new Morebits.simpleWindow( Twinkle.getPref('speedyWindowWidth'), Twinkle.getPref('speedyWindowHeight') );
	dialog = Twinkle.speedy.dialog;
	dialog.setTitle( "选择快速删除理由" );
	dialog.setScriptName( "Twinkle" );
	dialog.addFooterLink( "快速删除方针", "Wikivoyage:删除方针" );
	dialog.addFooterLink( "Twinkle帮助", "w:WP:TW/DOC#speedy" );

	var form = new Morebits.quickForm( callbackfunc, (Twinkle.getPref('speedySelectionStyle') === 'radioClick' ? 'change' : null) );
	if( Morebits.userIsInGroup( 'sysop' ) ) {
		form.append( {
				type: 'checkbox',
				list: [
					{
						label: '只标记，不删除',
						value: 'tag_only',
						name: 'tag_only',
						tooltip: '如果您只想标记此页面而不是删除它',
						checked : Twinkle.getPref('deleteSysopDefaultToTag'),
						event: function( event ) {
							var cForm = event.target.form;
							var cChecked = event.target.checked;
							// enable/disable talk page checkbox
							if (cForm.talkpage) {
								cForm.talkpage.disabled = cChecked;
								cForm.talkpage.checked = !cChecked && Twinkle.getPref('deleteTalkPageOnDelete');
							}
							// enable/disable redirects checkbox
							cForm.redirects.disabled = cChecked;
							cForm.redirects.checked = !cChecked;

							// enable/disable notify checkbox
							//cForm.notify.disabled = !cChecked;
							//cForm.notify.checked = cChecked;
							// enable/disable multiple
							//cForm.multiple.disabled = !cChecked;
							//cForm.multiple.checked = false;

							Twinkle.speedy.callback.modeChanged(cForm);

							event.stopPropagation();
						}
					}
				]
			} );
		form.append( { type: 'header', label: '删除相关选项' } );
		if (mw.config.get('wgNamespaceNumber') % 2 === 0 && (mw.config.get('wgNamespaceNumber') !== 2 || (/\//).test(mw.config.get('wgTitle')))) {  // hide option for user pages, to avoid accidentally deleting user talk page
			form.append( {
				type: 'checkbox',
				list: [
					{
						label: '删除讨论页',
						value: 'talkpage',
						name: 'talkpage',
						tooltip: "删除时附带删除此页面的讨论页。",
						checked: Twinkle.getPref('deleteTalkPageOnDelete'),
						disabled: Twinkle.getPref('deleteSysopDefaultToTag'),
						event: function( event ) {
							event.stopPropagation();
						}
					}
				]
			} );
		}
		form.append( {
				type: 'checkbox',
				list: [
					{
						label: '删除重定向',
						value: 'redirects',
						name: 'redirects',
						tooltip: "删除到此页的重定向。",
						checked: Twinkle.getPref('deleteRedirectsOnDelete'),
						disabled: Twinkle.getPref('deleteSysopDefaultToTag'),
						event: function( event ) {
							event.stopPropagation();
						}
					}
				]
			} );
		form.append( { type: 'header', label: '标记相关选项' } );
	}

	form.append( {
			type: 'checkbox',
			list: [
				{
					label: '如可能，通知创建者',
					value: 'notify',
					name: 'notify',
					tooltip: "一个通知模板将会被加入创建者的对话页，如果您启用了该理据的通知。",
					//checked: !Morebits.userIsInGroup( 'sysop' ) || Twinkle.getPref('deleteSysopDefaultToTag'),
					//disabled: Morebits.userIsInGroup( 'sysop' ) && !Twinkle.getPref('deleteSysopDefaultToTag'),
					checked: false,
					disabled: true,
					event: function( event ) {
						event.stopPropagation();
					}
				}
			]
		} );
	form.append( {
			type: 'checkbox',
			list: [
				{
					label: '应用多个理由',
					value: 'multiple',
					name: 'multiple',
					tooltip: "您可选择应用于该页的多个理由。",
					//disabled: Morebits.userIsInGroup( 'sysop' ) && !Twinkle.getPref('deleteSysopDefaultToTag'),
					disabled: true,
					event: function( event ) {
						Twinkle.speedy.callback.modeChanged( event.target.form );
						event.stopPropagation();
					}
				}
			]
		} );

	form.append( {
			type: 'div',
			name: 'work_area',
			label: '初始化CSD模块失败，请重试，或将这报告给Twinkle开发者。'
		} );

	if( Twinkle.getPref( 'speedySelectionStyle' ) !== 'radioClick' ) {
		form.append( { type: 'submit' } );
	}

	var result = form.render();
	dialog.setContent( result );
	dialog.display();

	Twinkle.speedy.callback.modeChanged( result );
};

Twinkle.speedy.callback.modeChanged = function twinklespeedyCallbackModeChanged(form) {
	var namespace = mw.config.get('wgNamespaceNumber');

	// first figure out what mode we're in
	var mode = Twinkle.speedy.mode.userSingleSubmit;
	if (form.tag_only && !form.tag_only.checked) {
		mode = Twinkle.speedy.mode.sysopSubmit;
	} else {
		if (false && form.multiple.checked) {
			mode = Twinkle.speedy.mode.userMultipleSubmit;
		} else {
			mode = Twinkle.speedy.mode.userSingleSubmit;
		}
	}
	if (Twinkle.getPref('speedySelectionStyle') === 'radioClick') {
		mode++;
	}

	var work_area = new Morebits.quickForm.element( {
			type: 'div',
			name: 'work_area'
		} );

	if (mode === Twinkle.speedy.mode.userMultipleRadioClick) {
		work_area.append( {
				type: 'div',
				label: '当选择完成后，点击：'
			} );
		work_area.append( {
				type: 'button',
				name: 'submit-multiple',
				label: '提交',
				event: function( event ) {
					Twinkle.speedy.callback.evaluateUser( event );
					event.stopPropagation();
				}
			} );
	}

	var radioOrCheckbox = (Twinkle.speedy.mode.isMultiple(mode) ? 'checkbox' : 'radio');

	/*switch (namespace) {
		case 0:  // article
			work_area.append( { type: 'header', label: '条目' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.articleList, mode) } );
			break;

		case 2:  // user
		case 3:  // user talk
			work_area.append( { type: 'header', label: '用户页' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.userList, mode) } );
			break;

		case 6:  // file
			work_area.append( { type: 'header', label: '文件' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.fileList, mode) } );
			if (!Twinkle.speedy.mode.isSysop(mode)) {
				work_area.append( { type: 'div', label: '标记CSD F3、F4，请使用Twinkle的“图权”功能。' } );
			}
			break;

		case 14:  // category
			work_area.append( { type: 'header', label: '分类' } );
			work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.categoryList, mode) } );
			break;

		default:
			break;
	}*/

	work_area.append( { type: 'header', label: '常规' } );
	work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.generalList, mode) });
	if (!Twinkle.speedy.mode.isSysop(mode)) {
		//work_area.append( { type: 'div', label: '标记CSD G16，请使用Twinkle的“侵权”功能。' } );
		work_area.append( { type: 'div', label: '标记侵权，请使用Twinkle的“侵权”功能。' } );
	}

	/*if (Morebits.wiki.isPageRedirect() || Morebits.userIsInGroup('sysop')) {
		work_area.append( { type: 'header', label: '重定向' } );
		work_area.append( { type: radioOrCheckbox, name: 'csd', list: Twinkle.speedy.generateCsdList(Twinkle.speedy.redirectList, mode) } );
	}*/

	var old_area = Morebits.quickForm.getElements(form, "work_area")[0];
	form.replaceChild(work_area.render(), old_area);
};

Twinkle.speedy.generateCsdList = function twinklespeedyGenerateCsdList(list, mode) {
	// mode switches
	var isSysop = Twinkle.speedy.mode.isSysop(mode);
	var multiple = Twinkle.speedy.mode.isMultiple(mode);
	var wantSubgroups = Twinkle.speedy.mode.wantSubgroups(mode);
	var hasSubmitButton = Twinkle.speedy.mode.hasSubmitButton(mode);

	var openSubgroupHandler = function(e) { 
		$(e.target.form).find('input').prop('disabled', true);
		$(e.target.form).children().css('color', 'gray');
		$(e.target).parent().css('color', 'black').find('input').prop('disabled', false);
		$(e.target).parent().find('input:text')[0].focus();
		e.stopPropagation();
	};
	var submitSubgroupHandler = function(e) {
		Twinkle.speedy.callback.evaluateUser(e);
		e.stopPropagation();
	};

	return $.map(list, function(critElement) {
		var criterion = $.extend({}, critElement);

		// hack to get the g11 radio / checkbox right
		if (criterion.value === 'g11') {
			criterion.style = Twinkle.getPref('enlargeG11Input') ? 'height: 2em; width: 2em; height: -moz-initial; width: -moz-initial; -moz-transform: scale(2); -o-transform: scale(2);' : '';
		}

		if (!wantSubgroups) {
			criterion.subgroup = null;
		}

		if (multiple) {
			if (criterion.hideWhenMultiple) {
				return null;
			}
			if (criterion.hideSubgroupWhenMultiple) {
				criterion.subgroup = null;
			}
		} else {
			if (criterion.hideWhenSingle) {
				return null;
			}
			if (criterion.hideSubgroupWhenSingle) {
				criterion.subgroup = null;
			}
		}

		if (isSysop) {
			if (criterion.hideWhenSysop) {
				return null;
			}
			if (criterion.hideSubgroupWhenSysop) {
				criterion.subgroup = null;
			}
		} else {
			if (criterion.hideWhenUser) {
				return null;
			}
			if (criterion.hideSubgroupWhenUser) {
				criterion.subgroup = null;
			}
		}

		if (criterion.subgroup && !hasSubmitButton) {
			if ($.isArray(criterion.subgroup)) {
				criterion.subgroup.push({ 
					type: 'button',
					name: 'submit',
					label: '提交',
					event: submitSubgroupHandler
				});
			} else {
				criterion.subgroup = [
					criterion.subgroup,
					{
						type: 'button',
						name: 'submit',  // ends up being called "csd.submit" so this is OK
						label: '提交',
						event: submitSubgroupHandler
					}
				];
			}
			criterion.event = openSubgroupHandler;
		}

		return criterion;
	});
};

Twinkle.speedy.fileList = [];

Twinkle.speedy.articleList = [];

Twinkle.speedy.categoryList = [];

Twinkle.speedy.userList = [];

Twinkle.speedy.generalList = [
	{
		label: '自定义理由' + (Morebits.userIsInGroup('sysop') ? '（自定义删除理由）' : ''),
		value: 'reason',
		tooltip: '该页至少应该符合一条快速删除的标准，并且您必须在理由中提到。这不是万能的删除理由。',
		subgroup: {
			name: 'reason_1',
			type: 'input',
			label: '理由：',
			size: 60
		},
		hideWhenMultiple: true,
		hideSubgroupWhenSysop: true
	}
];

Twinkle.speedy.redirectList = [];

Twinkle.speedy.normalizeHash = {
	'reason': 'db',
	'multiple': 'multiple',
	'multiple-finish': 'multiple-finish'
};

// keep this synched with [[MediaWiki:Deletereason-dropdown]]
Twinkle.speedy.reasonHash = {
	'reason': ''
};

Twinkle.speedy.callbacks = {
	sysop: {
		main: function( params ) {
			var thispage;

			Morebits.wiki.addCheckpoint();  // prevent actionCompleted from kicking in until user interaction is done

			// look up initial contributor. If prompting user for deletion reason, just display a link.
			// Otherwise open the talk page directly
			if( params.openusertalk ) {
				thispage = new Morebits.wiki.page( mw.config.get('wgPageName') );  // a necessary evil, in order to clear incorrect status text
				thispage.setCallbackParameters( params );
				thispage.lookupCreator( Twinkle.speedy.callbacks.sysop.openUserTalkPage );
			}

			// delete page
			var reason;
			thispage = new Morebits.wiki.page( mw.config.get('wgPageName'), "删除页面" );
			if (params.normalized === 'db') {
				reason = prompt("输入删除理由：", "");
			}
			if (reason === null) {
				Morebits.status.error("询问理由", "用户取消操作。");
				Morebits.wiki.removeCheckpoint();
				return;
			} else if (!reason || !reason.replace(/^\s*/, "").replace(/\s*$/, "")) {
				Morebits.status.error("询问理由", "你不给我理由…我就…不管了…");
				Morebits.wiki.removeCheckpoint();
				return;
			}
			thispage.setEditSummary( reason + Twinkle.getPref('deletionSummaryAd') );
			thispage.deletePage(function() {
				thispage.getStatusElement().info("完成");
				Twinkle.speedy.callbacks.sysop.deleteTalk( params );
			});
			Morebits.wiki.removeCheckpoint();
		},
		deleteTalk: function( params ) {
			// delete talk page
			if (params.deleteTalkPage &&
					params.normalized !== 'f7' &&
					params.normalized !== 'o1' &&
					document.getElementById( 'ca-talk' ).className !== 'new') {
				var talkpage = new Morebits.wiki.page( Morebits.wikipedia.namespaces[ mw.config.get('wgNamespaceNumber') + 1 ] + ':' + mw.config.get('wgTitle'), "删除讨论页" );
				talkpage.setEditSummary('孤立页面: 已删除页面“' + Morebits.pageNameNorm + "”的讨论页" + Twinkle.getPref('deletionSummaryAd'));
				talkpage.deletePage();
				// this is ugly, but because of the architecture of wiki.api, it is needed
				// (otherwise success/failure messages for the previous action would be suppressed)
				window.setTimeout(function() { Twinkle.speedy.callbacks.sysop.deleteRedirects( params ); }, 1800);
			} else {
				Twinkle.speedy.callbacks.sysop.deleteRedirects( params );
			}
		},
		deleteRedirects: function( params ) {
			// delete redirects
			if (params.deleteRedirects) {
				var query = {
					'action': 'query',
					'list': 'backlinks',
					'blfilterredir': 'redirects',
					'bltitle': mw.config.get('wgPageName'),
					'bllimit': 5000  // 500 is max for normal users, 5000 for bots and sysops
				};
				var wikipedia_api = new Morebits.wiki.api( '取得重定向列表…', query, Twinkle.speedy.callbacks.sysop.deleteRedirectsMain,
					new Morebits.status( '删除重定向' ) );
				wikipedia_api.params = params;
				wikipedia_api.post();
			}

			// prompt for protect on G11
			var $link, $bigtext;
			if (params.normalized === 'g11') {
				$link = $('<a/>', {
					'href': '#',
					'text': '点击这里施行保护',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' },
					'click': function(){
						Morebits.wiki.actionCompleted.redirect = null;
						Twinkle.speedy.dialog.close();
						mw.config.set('wgArticleId', 0);
						Twinkle.protect.callback();
					}
				});
				$bigtext = $('<span/>', {
					'text': '白纸保护该页',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' }
				});
				Morebits.status.info($bigtext[0], $link[0]);
			}

			// promote Unlink tool
			var $link, $bigtext;
			if( mw.config.get('wgNamespaceNumber') === 6 && params.normalized !== 'f7' ) {
				$link = $('<a/>', {
					'href': '#',
					'text': '点击这里前往反链工具',
					'css': { 'fontWeight': 'bold' },
					'click': function(){
						Morebits.wiki.actionCompleted.redirect = null;
						Twinkle.speedy.dialog.close();
						Twinkle.unlink.callback("取消对已删除文件 " + Morebits.pageNameNorm + " 的使用");
					}
				});
				$bigtext = $('<span/>', {
					'text': '取消对已删除文件的使用',
					'css': { 'fontWeight': 'bold' }
				});
				Morebits.status.info($bigtext[0], $link[0]);
			} else if (params.normalized !== 'f7') {
				$link = $('<a/>', {
					'href': '#',
					'text': '点击这里前往反链工具',
					'css': { 'fontWeight': 'bold' },
					'click': function(){
						Morebits.wiki.actionCompleted.redirect = null;
						Twinkle.speedy.dialog.close();
						Twinkle.unlink.callback("取消对已删除页面 " + Morebits.pageNameNorm + " 的链接");
					}
				});
				$bigtext = $('<span/>', {
					'text': '取消对已删除页面的链接',
					'css': { 'fontWeight': 'bold' }
				});
				Morebits.status.info($bigtext[0], $link[0]);
			}
		},
		openUserTalkPage: function( pageobj ) {
			pageobj.getStatusElement().unlink();  // don't need it anymore
			var user = pageobj.getCreator();
			var params = pageobj.getCallbackParameters();

			var query = {
				'title': 'User talk:' + user,
				'action': 'edit',
				'preview': 'yes',
				'vanarticle': Morebits.pageNameNorm
			};

			if (params.normalized === 'db' || Twinkle.getPref("promptForSpeedyDeletionSummary").indexOf(params.normalized) !== -1) {
				// provide a link to the user talk page
				var $link, $bigtext;
				$link = $('<a/>', {
					'href': mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ),
					'text': '点此打开User talk:' + user,
					'target': '_blank',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' }
				});
				$bigtext = $('<span/>', {
					'text': '通知页面创建者',
					'css': { 'fontSize': '130%', 'fontWeight': 'bold' }
				});
				Morebits.status.info($bigtext[0], $link[0]);
			} else {
				// open the initial contributor's talk page
				var statusIndicator = new Morebits.status('打开用户' + user + '对话页编辑表单', '打开中…');

				switch( Twinkle.getPref('userTalkPageMode') ) {
				case 'tab':
					window.open( mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ), '_blank' );
					break;
				case 'blank':
					window.open( mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ), '_blank', 'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800' );
					break;
				case 'window':
					/* falls through */
				default:
					window.open( mw.util.wikiScript('index') + '?' + Morebits.queryString.create( query ),
						( window.name === 'twinklewarnwindow' ? '_blank' : 'twinklewarnwindow' ),
						'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800' );
					break;
				}

				statusIndicator.info( '完成' );
			}
		},
		deleteRedirectsMain: function( apiobj ) {
			var xmlDoc = apiobj.getXML();
			var $snapshot = $(xmlDoc).find('backlinks bl');
			var total = $snapshot.length;
			var statusIndicator = apiobj.statelem;

			if( !total ) {
				statusIndicator.status("未发现重定向");
				return;
			}

			statusIndicator.status("0%");

			var current = 0;
			var onsuccess = function( apiobjInner ) {
				var now = parseInt( 100 * (++current)/total, 10 ) + '%';
				statusIndicator.update( now );
				apiobjInner.statelem.unlink();
				if( current >= total ) {
					statusIndicator.info( now + '（完成）' );
					Morebits.wiki.removeCheckpoint();
				}
			};

			Morebits.wiki.addCheckpoint();

			$snapshot.each(function(key, value) {
				var title = $(value).attr('title');
				var page = new Morebits.wiki.page(title, '删除重定向 "' + title + '"');
				page.setEditSummary('孤立页面: 重定向到已删除页面“' + Morebits.pageNameNorm + "”" + Twinkle.getPref('deletionSummaryAd'));
				page.deletePage(onsuccess);
			});
		}
	},

	user: {
		main: function(pageobj) {
			var statelem = pageobj.getStatusElement();

			if (!pageobj.exists()) {
				statelem.error( "页面不存在，可能已被删除" );
				return;
			}

			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();

			statelem.status( '检查页面已有标记…' );

			// check for existing deletion tags
			var tag = /(?:\{\{\s*(db|d|delete|db-.*?)(?:\s*\||\s*\}\}))/i.exec( text );
			if( tag ) {
				statelem.error( [ Morebits.htmlNode( 'strong', tag[1] ) , " 已被置于页面中。" ] );
				return;
			}

			var xfd = /(?:\{\{(vfd)[^{}]*?\}\})/i.exec( text );
			if( xfd && !confirm( "删除相关模板{{" + xfd[1] + "}}已被置于页面中，您是否仍想添加一个快速删除模板？" ) ) {
				return;
			}

			var code, parameters, i;

			parameters = params.templateParams[0] || [];
			code = "{{delete";
			for (i in parameters) {
				if (typeof parameters[i] === 'string') {
					code += "|" + parameters[i];
				}
			}
			code += "}}";
			params.utparams = Twinkle.speedy.getUserTalkParameters(params.normalizeds[0], parameters);

			var thispage = new Morebits.wiki.page(mw.config.get('wgPageName'));
			// patrol the page, if reached from Special:NewPages
			if( Twinkle.getPref('markSpeedyPagesAsPatrolled') ) {
				thispage.patrol();
			}

			// Wrap SD template in noinclude tags if we are in template space.
			// Won't work with userboxes in userspace, or any other transcluded page outside template space
			if (mw.config.get('wgNamespaceNumber') === 10) {  // Template:
				code = "<noinclude>" + code + "</noinclude>";
			}

			// Remove tags that become superfluous with this action
			text = text.replace(/\{\{\s*([Nn]ew unreviewed article|[Uu]nreviewed|[Uu]serspace draft)\s*(\|(?:\{\{[^{}]*\}\}|[^{}])*)?\}\}\s*/g, "");
			if (mw.config.get('wgNamespaceNumber') === 6) {
				// remove "move to Commons" tag - deletion-tagged files cannot be moved to Commons
				text = text.replace(/\{\{(mtc|(copy |move )?to ?commons|move to wikimedia commons|copy to wikimedia commons)[^}]*\}\}/gi, "");
			}

			// Generate edit summary for edit
			var editsummary;
			editsummary = '请求快速删除：' + parameters["1"];

			pageobj.setPageText(code + "\n" + text);
			pageobj.setEditSummary(editsummary + Twinkle.getPref('summaryAd'));
			pageobj.setWatchlist(params.watch);
			pageobj.setCreateOption('nocreate');
			pageobj.save(Twinkle.speedy.callbacks.user.tagComplete);
		},

		tagComplete: function(pageobj) {
			var params = pageobj.getCallbackParameters();

			// Notification to first contributor
			if (params.usertalk) {
				var callback = function(pageobj) {
					var initialContrib = pageobj.getCreator();

					// disallow warning yourself
					if (initialContrib === mw.config.get('wgUserName')) {
						Morebits.status.warn("您（" + initialContrib + "）创建了该页，跳过通知");

					// don't notify users when their user talk page is nominated
					} else if (initialContrib === mw.config.get('wgTitle') && mw.config.get('wgNamespaceNumber') === 3) {
						Morebits.status.warn("通知页面创建者：用户创建了自己的对话页");

					} else {
						var usertalkpage = new Morebits.wiki.page('User talk:' + initialContrib, "通知页面创建者（" + initialContrib + "）"),
							notifytext, i;

						notifytext = "\n{{subst:db-notice|target=" + Morebits.pageNameNorm;
						notifytext += (params.welcomeuser ? "" : "|nowelcome=yes") + "}}--~~~~";

						var editsummary = "通知：";
						if (params.normalizeds.indexOf("g12") === -1) {  // no article name in summary for G10 deletions
							editsummary += "页面[[" + Morebits.pageNameNorm + "]]";
						} else {
							editsummary += "一攻击性页面";
						}
						editsummary += "快速删除提名";

						usertalkpage.setAppendText(notifytext);
						usertalkpage.setEditSummary(editsummary + Twinkle.getPref('summaryAd'));
						usertalkpage.setCreateOption('recreate');
						usertalkpage.setFollowRedirect(true);
						usertalkpage.append();
					}

					// add this nomination to the user's userspace log, if the user has enabled it
					if (params.lognomination) {
						Twinkle.speedy.callbacks.user.addToLog(params, initialContrib);
					}
				};
				var thispage = new Morebits.wiki.page(Morebits.pageNameNorm);
				thispage.lookupCreator(callback);
			}
			// or, if not notifying, add this nomination to the user's userspace log without the initial contributor's name
			else if (params.lognomination) {
				Twinkle.speedy.callbacks.user.addToLog(params, null);
			}
		},

		// note: this code is also invoked from twinkleimage
		// the params used are:
		//   for CSD: params.values, params.normalizeds  (note: normalizeds is an array)
		//   for DI: params.fromDI = true, params.type, params.normalized  (note: normalized is a string)
		addToLog: function(params, initialContrib) {
			var wikipedia_page = new Morebits.wiki.page("User:" + mw.config.get('wgUserName') + "/" + Twinkle.getPref('speedyLogPageName'), "添加项目到用户日志");
			params.logInitialContrib = initialContrib;
			wikipedia_page.setCallbackParameters(params);
			wikipedia_page.load(Twinkle.speedy.callbacks.user.saveLog);
		},

		saveLog: function(pageobj) {
			var text = pageobj.getPageText();
			var params = pageobj.getCallbackParameters();

			var appendText = "";

			// add blurb if log page doesn't exist
			if (!pageobj.exists()) {
				appendText +=
					"这是该用户使用[[WV:TW|Twinkle]]的速删模块做出的快速删除提名列表。\n\n" +
					"如果您不再想保留此日志，请在[[Wikivoyage:Twinkle/参数设置|参数设置]]中关掉，并" +
					"提交快速删除。\n";
				if (Morebits.userIsInGroup("sysop")) {
					appendText += "\n此日志并不记录用Twinkle直接执行的删除。\n";
				}
			}

			// create monthly header
			var date = new Date();
			var headerRe = new RegExp("^==+\\s*" + date.getUTCFullYear() + "\\s*年\\s*" + (date.getUTCMonth() + 1) + "\\s*月\\s*==+", "m");
			if (!headerRe.exec(text)) {
				appendText += "\n\n=== " + date.getUTCFullYear() + "年" + (date.getUTCMonth() + 1) + "月 ===";
			}

			appendText += "\n# [[:" + Morebits.pageNameNorm + "]]: ";
			if (params.fromDI) {
				appendText += "图版[[WP:CSD#" + params.normalized.toUpperCase() + "|CSD " + params.normalized.toUpperCase() + "]]（" + params.type + "）";
			} else {
				appendText += "自定义理由";
			}

			if (params.logInitialContrib) {
				appendText += "；通知{{user|" + params.logInitialContrib + "}}";
			}
			appendText += " ~~~~~\n";

			pageobj.setAppendText(appendText);
			pageobj.setEditSummary("记录对[[" + Morebits.pageNameNorm + "]]的快速删除提名。" + Twinkle.getPref('summaryAd'));
			pageobj.setCreateOption("recreate");
			pageobj.append();
		}
	}
};

// validate subgroups in the form passed into the speedy deletion tag
Twinkle.speedy.getParameters = function twinklespeedyGetParameters(form, values) {
	var parameters = [];

	$.each(values, function(index, value) {
		var currentParams = [];
		switch (value) {
			case 'reason':
				if (form["csd.reason_1"]) {
					var dbrationale = form["csd.reason_1"].value;
					if (!dbrationale || !dbrationale.trim()) {
						alert( '自定义理由：请指定理由。' );
						parameters = null;
						return false;
					}
					currentParams["1"] = dbrationale;
				}
				break;

			default:
				break;
		}
		parameters.push(currentParams);
	});
	return parameters;
};

// function for processing talk page notification template parameters
Twinkle.speedy.getUserTalkParameters = function twinklespeedyGetUserTalkParameters(normalized, parameters) {
	var utparams = [];
	switch (normalized) {
		default:
			break;
	}
	return utparams;
};


Twinkle.speedy.resolveCsdValues = function twinklespeedyResolveCsdValues(e) {
	var values = (e.target.form ? e.target.form : e.target).getChecked('csd');
	if (values.length === 0) {
		alert( "请选择一个理据！" );
		return null;
	}
	return values;
};

Twinkle.speedy.callback.evaluateSysop = function twinklespeedyCallbackEvaluateSysop(e) {
	var form = (e.target.form ? e.target.form : e.target);

	var tag_only = form.tag_only;
	if( tag_only && tag_only.checked ) {
		Twinkle.speedy.callback.evaluateUser(e);
		return;
	}

	var value = Twinkle.speedy.resolveCsdValues(e)[0];
	if (!value) {
		return;
	}
	var normalized = Twinkle.speedy.normalizeHash[ value ];

	var params = {
		value: value,
		normalized: normalized,
		watch: Twinkle.getPref('watchSpeedyPages').indexOf( normalized ) !== -1,
		reason: Twinkle.speedy.reasonHash[ value ],
		openusertalk: Twinkle.getPref('openUserTalkPageOnSpeedyDelete').indexOf( normalized ) !== -1,
		deleteTalkPage: form.talkpage && form.talkpage.checked,
		deleteRedirects: form.redirects.checked
	};

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( form );

	Twinkle.speedy.callbacks.sysop.main( params );
};

Twinkle.speedy.callback.evaluateUser = function twinklespeedyCallbackEvaluateUser(e) {
	var form = (e.target.form ? e.target.form : e.target);

	if (e.target.type === "checkbox" || e.target.type === "text" || 
			e.target.type === "select") {
		return;
	}

	var values = Twinkle.speedy.resolveCsdValues(e);
	if (!values) {
		return;
	}
	//var multiple = form.multiple.checked;
	var normalizeds = [];
	$.each(values, function(index, value) {
		var norm = Twinkle.speedy.normalizeHash[ value ];

		normalizeds.push(norm);
	});

	// analyse each criterion to determine whether to watch the page/notify the creator
	var watchPage = false;
	$.each(normalizeds, function(index, norm) {
		if (Twinkle.getPref('watchSpeedyPages').indexOf(norm) !== -1) {
			watchPage = true;
			return false;  // break
		}
	});

	var notifyuser = false;
	if (false && form.notify.checked) {
		$.each(normalizeds, function(index, norm) {
			if (Twinkle.getPref('notifyUserOnSpeedyDeletionNomination').indexOf(norm) !== -1) {
				notifyuser = true;
				return false;  // break
			}
		});
	}

	var welcomeuser = false;
	if (notifyuser) {
		$.each(normalizeds, function(index, norm) {
			if (Twinkle.getPref('welcomeUserOnSpeedyDeletionNotification').indexOf(norm) !== -1) {
				welcomeuser = true;
				return false;  // break
			}
		});
	}

	var csdlog = false;
	if (Twinkle.getPref('logSpeedyNominations')) {
		$.each(normalizeds, function(index, norm) {
			if (Twinkle.getPref('noLogOnSpeedyNomination').indexOf(norm) === -1) {
				csdlog = true;
				return false;  // break
			}
		});
	}

	var params = {
		values: values,
		normalizeds: normalizeds,
		watch: watchPage,
		usertalk: notifyuser,
		welcomeuser: welcomeuser,
		lognomination: csdlog,
		templateParams: Twinkle.speedy.getParameters( form, values )
	};
	if (!params.templateParams) {
		return;
	}

	Morebits.simpleWindow.setButtonsEnabled( false );
	Morebits.status.init( form );

	Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
	Morebits.wiki.actionCompleted.notice = "标记完成";

	var wikipedia_page = new Morebits.wiki.page(mw.config.get('wgPageName'), "标记页面");
	wikipedia_page.setCallbackParameters(params);
	wikipedia_page.load(Twinkle.speedy.callbacks.user.main);
};
})(jQuery);


//</nowiki>
