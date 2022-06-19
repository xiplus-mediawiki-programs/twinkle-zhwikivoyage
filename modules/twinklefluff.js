// <nowiki>
// vim: set noet sts=0 sw=8:


(function($) {


/*
 ****************************************
 *** twinklefluff.js: Revert/rollback module
 ****************************************
 * Mode of invocation:     Links on history, contributions, and diff pages
 * Active on:              Diff pages, history pages, contributions pages
 * Config directives in:   TwinkleConfig
 */

/**
 Twinklefluff revert and antivandalism utility
 */

Twinkle.fluff = {
	auto: function() {
		if (parseInt(mw.util.getParamValue('oldid'), 10) !== mw.config.get('wgCurRevisionId')) {
			// not latest revision
			alert(wgULS('无法回退，页面在此期间已被修改。', '無法回退，頁面在此期間已被修改。'));
			return;
		}

		var vandal = $('#mw-diff-ntitle2').find('a.mw-userlink').text();

		Twinkle.fluff.revert(mw.util.getParamValue('twinklerevert'), vandal, true);
	},
	normal: function() {

		var spanTag = function(color, content) {
			var span = document.createElement('span');
			span.style.color = color;
			span.appendChild(document.createTextNode(content));
			return span;
		};

		if (mw.config.get('wgNamespaceNumber') === -1 && mw.config.get('wgCanonicalSpecialPageName') === 'Contributions') {
			// Get the username these contributions are for
			var logLink = $('#contentSub').find(wgULS('a[title^="Special:日志"]', 'a[title^="Special:日誌"]')).last();
			if (logLink.length > 0) {
				var username = decodeURIComponent(/wiki\/Special:%E6%97%A5%E5%BF%97\/(.+)$/.exec(logLink.attr('href').replace(/_/g, '%20'))[1]);
				if (Twinkle.getPref('showRollbackLinks').indexOf('contribs') !== -1 ||
					(mw.config.get('wgUserName') !== username && Twinkle.getPref('showRollbackLinks').indexOf('others') !== -1) ||
					(mw.config.get('wgUserName') === username && Twinkle.getPref('showRollbackLinks').indexOf('mine') !== -1)) {
					var list = $('#mw-content-text').find('ul li:has(span.mw-uctop)');

					var revNode = document.createElement('strong');
					var revLink = document.createElement('a');
					revLink.appendChild(spanTag('Black', '['));
					revLink.appendChild(spanTag('SteelBlue', '回退'));
					revLink.appendChild(spanTag('Black', ']'));
					revNode.appendChild(revLink);

					var revVandNode = document.createElement('strong');
					var revVandLink = document.createElement('a');
					revVandLink.appendChild(spanTag('Black', '['));
					revVandLink.appendChild(spanTag('Red', wgULS('破坏', '破壞')));
					revVandLink.appendChild(spanTag('Black', ']'));
					revVandNode.appendChild(revVandLink);

					list.each(function(key, current) {
						var href = $(current).children('a:eq(1)').attr('href');
						current.appendChild(document.createTextNode(' '));
						var tmpNode = revNode.cloneNode(true);
						tmpNode.firstChild.setAttribute('href', href + '&' + $.param({ 'twinklerevert': 'norm' }));
						current.appendChild(tmpNode);
						current.appendChild(document.createTextNode(' '));
						tmpNode = revVandNode.cloneNode(true);
						tmpNode.firstChild.setAttribute('href', href + '&' + $.param({ 'twinklerevert': 'vand' }));
						current.appendChild(tmpNode);
					});
				}
			}
		} else {

			if (mw.config.get('wgCanonicalSpecialPageName') === 'Undelete') {
				// You can't rollback deleted pages!
				return;
			}

			var firstRev = $('div.firstrevisionheader').length;
			if (firstRev) {
				// we have first revision here, nothing to do.
				return;
			}

			var otitle, ntitle;
			try {
				var otitle1 = document.getElementById('mw-diff-otitle1');
				var ntitle1 = document.getElementById('mw-diff-ntitle1');
				if (!otitle1 || !ntitle1) {
					return;
				}
				otitle = otitle1.parentNode;
				ntitle = ntitle1.parentNode;
			} catch (e) {
				// no old, nor new title, nothing to do really, return;
				return;
			}

			var old_rev_url = $('#mw-diff-otitle1').find('strong a').attr('href');

			// Lets first add a [edit this revision] link
			var query = new Morebits.queryString(old_rev_url.split('?', 2)[1]);

			var oldrev = query.get('oldid');

			var revertToRevision = document.createElement('div');
			revertToRevision.setAttribute('id', 'tw-revert-to-orevision');
			revertToRevision.style.fontWeight = 'bold';

			var revertToRevisionLink = revertToRevision.appendChild(document.createElement('a'));
			revertToRevisionLink.href = '#';
			$(revertToRevisionLink).click(function() {
				Twinkle.fluff.revertToRevision(oldrev);
			});
			revertToRevisionLink.appendChild(spanTag('Black', '['));
			revertToRevisionLink.appendChild(spanTag('SaddleBrown', wgULS('恢复此版本', '恢復此版本')));
			revertToRevisionLink.appendChild(spanTag('Black', ']'));

			otitle.insertBefore(revertToRevision, otitle.firstChild);

			if (document.getElementById('differences-nextlink')) {
				// Not latest revision
				var new_rev_url = $('#mw-diff-ntitle1').find('strong a').attr('href');
				query = new Morebits.queryString(new_rev_url.split('?', 2)[1]);
				var newrev = query.get('oldid');
				revertToRevision = document.createElement('div');
				revertToRevision.setAttribute('id', 'tw-revert-to-nrevision');
				revertToRevision.style.fontWeight = 'bold';
				revertToRevisionLink = revertToRevision.appendChild(document.createElement('a'));
				revertToRevisionLink.href = '#';
				$(revertToRevisionLink).click(function() {
					Twinkle.fluff.revertToRevision(newrev);
				});
				revertToRevisionLink.appendChild(spanTag('Black', '['));
				revertToRevisionLink.appendChild(spanTag('SaddleBrown', wgULS('恢复此版本', '恢復此版本')));
				revertToRevisionLink.appendChild(spanTag('Black', ']'));
				ntitle.insertBefore(revertToRevision, ntitle.firstChild);

				return;
			}
			if (Twinkle.getPref('showRollbackLinks').indexOf('diff') !== -1) {
				var vandal = $('#mw-diff-ntitle2').find('a').first().text();

				var revertNode = document.createElement('div');
				revertNode.setAttribute('id', 'tw-revert');

				var agfNode = document.createElement('strong');
				var vandNode = document.createElement('strong');
				var normNode = document.createElement('strong');

				var agfLink = document.createElement('a');
				var vandLink = document.createElement('a');
				var normLink = document.createElement('a');

				agfLink.href = '#';
				vandLink.href = '#';
				normLink.href = '#';
				$(agfLink).click(function() {
					Twinkle.fluff.revert('agf', vandal);
				});
				$(vandLink).click(function() {
					Twinkle.fluff.revert('vand', vandal);
				});
				$(normLink).click(function() {
					Twinkle.fluff.revert('norm', vandal);
				});

				agfLink.appendChild(spanTag('Black', '['));
				agfLink.appendChild(spanTag('DarkOliveGreen', '回退（AGF）'));
				agfLink.appendChild(spanTag('Black', ']'));

				vandLink.appendChild(spanTag('Black', '['));
				vandLink.appendChild(spanTag('Red', wgULS('回退（破坏）', '回退（破壞）')));
				vandLink.appendChild(spanTag('Black', ']'));

				normLink.appendChild(spanTag('Black', '['));
				normLink.appendChild(spanTag('SteelBlue', '回退'));
				normLink.appendChild(spanTag('Black', ']'));

				agfNode.appendChild(agfLink);
				vandNode.appendChild(vandLink);
				normNode.appendChild(normLink);

				revertNode.appendChild(agfNode);
				revertNode.appendChild(document.createTextNode(' || '));
				revertNode.appendChild(normNode);
				revertNode.appendChild(document.createTextNode(' || '));
				revertNode.appendChild(vandNode);

				ntitle.insertBefore(revertNode, ntitle.firstChild);
			}
		}
	}
};

Twinkle.fluff.revert = function revertPage(type, vandal, autoRevert, rev, page) {
	if (mw.util.isIPv6Address(vandal)) {
		vandal = Morebits.sanitizeIPv6(vandal);
	}

	var pagename = page || mw.config.get('wgPageName');
	var revid = rev || mw.config.get('wgCurRevisionId');

	Morebits.status.init(document.getElementById('mw-content-text'));
	$('#catlinks').remove();

	var params = {
		type: type,
		user: vandal,
		pagename: pagename,
		revid: revid,
		autoRevert: !!autoRevert
	};
	var query = {
		'action': 'query',
		'prop': ['info', 'revisions'],
		'titles': pagename,
		'rvlimit': 50, // max possible
		'rvprop': [ 'ids', 'timestamp', 'user', 'comment' ],
		'intoken': 'edit'
	};
	var wikipedia_api = new Morebits.wiki.api(wgULS('抓取较早修订版本信息', '抓取較早修訂版本訊息'), query, Twinkle.fluff.callbacks.main);
	wikipedia_api.params = params;
	wikipedia_api.post();
};

Twinkle.fluff.revertToRevision = function revertToRevision(oldrev) {

	Morebits.status.init(document.getElementById('mw-content-text'));

	var query = {
		'action': 'query',
		'prop': ['info', 'revisions'],
		'titles': mw.config.get('wgPageName'),
		'rvlimit': 1,
		'rvstartid': oldrev,
		'rvprop': [ 'ids', 'timestamp', 'user', 'comment' ],
		'intoken': 'edit',
		'format': 'xml'
	};
	var wikipedia_api = new Morebits.wiki.api(wgULS('抓取较早修订版本信息', '抓取較早修訂版本訊息'), query, Twinkle.fluff.callbacks.toRevision.main);
	wikipedia_api.params = { rev: oldrev };
	wikipedia_api.post();
};

Twinkle.fluff.userIpLink = function(user) {
	return (Morebits.isIPAddress(user) ? '[[Special:Contributions/' : '[[User:') + user + '|' + user + ']]';
};

Twinkle.fluff.callbacks = {
	toRevision: {
		main: function(self) {
			var xmlDoc = self.responseXML;

			var lastrevid = parseInt($(xmlDoc).find('page').attr('lastrevid'), 10);
			var touched = $(xmlDoc).find('page').attr('touched');
			var starttimestamp = $(xmlDoc).find('page').attr('starttimestamp');
			var edittoken = $(xmlDoc).find('page').attr('edittoken');
			var revertToRevID = $(xmlDoc).find('rev').attr('revid');
			var revertToUser = $(xmlDoc).find('rev').attr('user');

			if (revertToRevID !== self.params.rev) {
				self.statitem.error(wgULS('抓取到的修订版本与请求的修订版本不符，取消。', '抓取到的修訂版本與請求的修訂版本不符，取消。 '));
				return;
			}

			var optional_summary = prompt(wgULS('请输入回退理由：                                ', '請輸入回退理由：                                '), '');  // padded out to widen prompt in Firefox
			if (optional_summary === null) {
				self.statelem.error(wgULS('由用户取消。', '由用戶取消。 '));
				return;
			}
			var summary = Twinkle.fluff.formatSummary(wgULS('回退到由$USER做出的修订版本', '回退到由$USER做出的修訂版本') + revertToRevID, revertToUser, optional_summary);

			var query = {
				'action': 'edit',
				'title': mw.config.get('wgPageName'),
				'summary': summary,
				'token': edittoken,
				'undo': lastrevid,
				'undoafter': revertToRevID,
				'basetimestamp': touched,
				'starttimestamp': starttimestamp,
				'watchlist': Twinkle.getPref('watchRevertedPages').indexOf(self.params.type) !== -1 ? 'watch' : undefined,
				'minor': Twinkle.getPref('markRevertedPagesAsMinor').indexOf(self.params.type) !== -1 ? true : undefined
			};

			Morebits.wiki.actionCompleted.redirect = mw.config.get('wgPageName');
			Morebits.wiki.actionCompleted.notice = wgULS('修订版本完成', '修訂版本完成');

			var wikipedia_api = new Morebits.wiki.api(wgULS('保存回退内容', '儲存回退內容'), query, Twinkle.fluff.callbacks.complete, self.statelem);
			wikipedia_api.params = self.params;
			wikipedia_api.post();

		}
	},
	main: function(self) {
		var xmlDoc = self.responseXML;

		var lastrevid = parseInt($(xmlDoc).find('page').attr('lastrevid'), 10);
		var touched = $(xmlDoc).find('page').attr('touched');
		var starttimestamp = $(xmlDoc).find('page').attr('starttimestamp');
		var edittoken = $(xmlDoc).find('page').attr('edittoken');
		var lastuser = $(xmlDoc).find('rev').attr('user');

		var revs = $(xmlDoc).find('rev');

		if (revs.length < 1) {
			self.statelem.error(wgULS('没有其它修订版本，无法回退', '沒有其他修訂版本，無法回退'));
			return;
		}
		var top = revs[0];
		if (lastrevid < self.params.revid) {
			Morebits.status.error(wgULS('错误', '錯誤'), [ wgULS('从服务器取得的最新修订版本ID ', '從服務器取得的最新修訂版本ID '), Morebits.htmlNode('strong', lastrevid), wgULS(' 小于目前所显示的修订版本ID。这可能意味着当前修订版本已被删除、服务器延迟、或抓取到了坏掉的信息。取消。', ' 小於目前所顯示的修訂版本ID。這可能代表著當前修訂版本已被刪除、服務器延遲、或抓取到了壞掉的訊息。取消。') ]);
			return;
		}
		var index = 1;
		if (self.params.revid !== lastrevid) {
			Morebits.status.warn(wgULS('警告', '警告'), [ wgULS('最新修订版本 ', '最新修訂版本 '), Morebits.htmlNode('strong', lastrevid), wgULS(' 与我们的修订版本 ', ' 與我們的修訂版本 '), Morebits.htmlNode('strong', self.params.revid), '不等' ]);
			if (lastuser === self.params.user) {
				switch (self.params.type) {
					case 'vand':
						Morebits.status.info(wgULS('信息', '訊息'), [ wgULS('最新修订版本由 ', '最新修訂版本由 '), Morebits.htmlNode('strong', self.params.user), wgULS(' 做出，因我们假定破坏，继续回退操作。', ' 做出，因我們假定破壞，繼續回退操作。 ') ]);
						break;
					case 'agf':
						Morebits.status.warn(wgULS('警告', '警告'), [ wgULS('最新修订版本由 ', '最新修訂版本由 '), Morebits.htmlNode('strong', self.params.user), wgULS(' 做出，因我们假定善意，取消回退操作，因为问题可能已被修复。', ' 做出，因我們假定善意，取消回退操作，因為問題可能已被修復。 ') ]);
						return;
					default:
						Morebits.status.warn('提示', [ wgULS('最新修订版本由 ', '最新修訂版本由 '), Morebits.htmlNode('strong', self.params.user), wgULS(' 做出，但我们还是不回退了。', ' 做出，但我們還是不回退了。 ') ]);
						return;
				}
			} else if (self.params.type === 'vand' &&
					Twinkle.fluff.whiteList.indexOf(top.getAttribute('user')) !== -1 && revs.length > 1 &&
					revs[1].getAttribute('pageId') === self.params.revid) {
				Morebits.status.info(wgULS('信息', '訊息'), [ wgULS('最新修订版本由 ', '最新修訂版本由 '), Morebits.htmlNode('strong', lastuser), wgULS('，一个可信的机器人做出，之前的版本被认为是破坏，继续回退操作。', '，一個可信的機器人做出，之前的版本被認為是破壞，繼續回退操作。 ') ]);
				index = 2;
			} else {
				Morebits.status.error(wgULS('错误', '錯誤'), [ wgULS('最新修订版本由 ', '最新修訂版本由 '), Morebits.htmlNode('strong', lastuser), wgULS(' 做出，所以这个修订版本可能已经被回退了，取消回退操作。', ' 做出，所以這個修訂版本可能已經被回退了，取消回退操作。 ')]);
				return;
			}

		}

		if (Twinkle.fluff.whiteList.indexOf(self.params.user) !== -1) {
			switch (self.params.type) {
				case 'vand':
					Morebits.status.info(wgULS('信息', '訊息'), [ wgULS('将对 ', '將對 '), Morebits.htmlNode('strong', self.params.user), wgULS(' 执行破坏回退，这是一个可信的机器人，我们假定您要回退前一个修订版本。', ' 執行破壞回退，這是一個可信的機器人，我們假定您要回退前一個修訂版本。 ') ]);
					index = 2;
					self.params.user = revs[1].getAttribute('user');
					break;
				case 'agf':
					Morebits.status.warn('提示', [ wgULS('将对 ', '將對 '), Morebits.htmlNode('strong', self.params.user), wgULS(' 执行善意回退，这是一个可信的机器人，取消回退操作。', ' 執行善意回退，這是一個可信的機器人，取消回退操作。 ') ]);
					return;
				case 'norm':
				/* falls through */
				default:
					var cont = confirm(wgULS('选择了常规回退，但最新修改是由一个可信的机器人（', '選擇了正規回退，但最新修改是由一個可信的機器人（') + self.params.user + wgULS('）做出的。您是否想回退前一个修订版本？', '）做出的。您是否想回退前一個修訂版本？ '));
					if (cont) {
						Morebits.status.info(wgULS('信息', '訊息'), [ wgULS('将对 ', '將對 '), Morebits.htmlNode('strong', self.params.user), wgULS(' 执行常规回退，这是一个可信的机器人，基于确认，我们将回退前一个修订版本。', ' 執行正規回退，這是一個可信的機器人，基於確認，​​我們將回退前一個修訂版本。 ') ]);
						index = 2;
						self.params.user = revs[1].getAttribute('user');
					} else {
						Morebits.status.warn('提示', [ wgULS('将对 ', '將對 '), Morebits.htmlNode('strong', self.params.user), wgULS(' 执行常规回退，这是一个可信的机器人，基于确认，我们仍将回退这个修订版本。', ' 執行正規回退，這是一個可信的機器人，基於確認，​​我們仍將回退這個修訂版本。 ') ]);
					}
					break;
			}
		}
		var found = false;
		var count = 0;

		for (var i = index; i < revs.length; ++i) {
			++count;
			if (revs[i].getAttribute('user') !== self.params.user) {
				found = i;
				break;
			}
		}

		if (!found) {
			self.statelem.error([ wgULS('未找到之前的修订版本，可能 ', '未找到之前的修訂版本，可能 '), Morebits.htmlNode('strong', self.params.user), wgULS(' 是唯一贡献者，或这个用户连续做出了超过 ', ' 是唯一貢獻者，或這個用戶連續做出了超過 ') + Twinkle.getPref('revertMaxRevisions') + wgULS(' 次编辑。', ' 次編輯。') ]);
			return;
		}

		if (!count) {
			Morebits.status.error(wgULS('错误', '錯誤'), wgULS('我们将要回退0个修订版本，这没有意义，所以取消回退操作。可能是因为这个修订版本已经被回退，但修订版本ID仍是一样的。', '我們將要回退0個修訂版本，這沒有意義，所以取消回退操作。可能是因為這個修訂版本已經被回退，但修訂版本ID仍是一樣的。'));
			return;
		}

		var good_revision = revs[found];
		var userHasAlreadyConfirmedAction = false;
		if (self.params.type !== 'vand' && count > 1) {
			if (!confirm(self.params.user + wgULS(' 连续做出了 ', ' 連續做出了 ') + count + wgULS(' 次编辑，是否要回退所有这些？', ' 次編輯，是否​​要回退所有這些？ '))) {
				Morebits.status.info(wgULS('用户取消操作。', '用戶取消操作。'));
				return;
			}
			userHasAlreadyConfirmedAction = true;
		}

		self.params.count = count;

		self.params.goodid = good_revision.getAttribute('revid');
		self.params.gooduser = good_revision.getAttribute('user');

		self.statelem.status([ Morebits.htmlNode('strong', count), wgULS(' 个修订版本之前由 ', ' 個修訂版本之前由 '), Morebits.htmlNode('strong', self.params.gooduser), wgULS(' 做出的修订版本 ', ' 做出的修訂版本 '), Morebits.htmlNode('strong', self.params.goodid) ]);

		var summary, extra_summary;
		switch (self.params.type) {
			case 'agf':
				extra_summary = prompt(wgULS('可选的编辑摘要：                              ', '可選的編輯摘要：                              '), '');  // padded out to widen prompt in Firefox
				if (extra_summary === null) {
					self.statelem.error(wgULS('用户取消操作。', '用戶取消操作。'));
					return;
				}
				userHasAlreadyConfirmedAction = true;

				summary = Twinkle.fluff.formatSummary(wgULS('回退$USER做出的出于[[w:WP:AGF|善意]]的编辑', '回退$USER做出的出於[[w:WP:AGF|善意]]的編輯'), self.params.user, extra_summary);
				break;

			case 'vand':

				summary = '回退[[Special:Contributions/' +
				self.params.user + '|' + self.params.user + ']] ([[User talk:' + self.params.user + wgULS('|讨论]])', '|討論]])') +
				'做出的 ' + self.params.count + wgULS(' 次编辑，到由', ' 次編輯，到由') +
				self.params.gooduser + wgULS('做出的前一个修订版本 ', '做出的前一個修訂版本 ') + Twinkle.getPref('summaryAd');
				break;

			case 'norm':
			/* falls through */
			default:
				if (Twinkle.getPref('offerReasonOnNormalRevert')) {
					extra_summary = prompt(wgULS('可选的编辑摘要：                              ', '可選的編輯摘要：                              '), '');  // padded out to widen prompt in Firefox
					if (extra_summary === null) {
						self.statelem.error(wgULS('用户取消操作。', '用戶取消操作。'));
						return;
					}
					userHasAlreadyConfirmedAction = true;
				}

				summary = Twinkle.fluff.formatSummary('回退$USER做出的' + self.params.count + wgULS('次编辑', '次編輯'), self.params.user, extra_summary);
				break;
		}

		if (Twinkle.getPref('confirmOnFluff') && !userHasAlreadyConfirmedAction && !confirm(wgULS('回退页面：您确定吗？', '回退頁面：您確定嗎？'))) {
			self.statelem.error(wgULS('用户取消操作。', '用戶取消操作。'));
			return;
		}

		var query;
		if ((!self.params.autoRevert || Twinkle.getPref('openTalkPageOnAutoRevert')) &&
				Twinkle.getPref('openTalkPage').indexOf(self.params.type) !== -1 &&
				mw.config.get('wgUserName') !== self.params.user) {
			Morebits.status.info(wgULS('信息', '訊息'), [ wgULS('打开用户 ', '打開用戶 '), Morebits.htmlNode('strong', self.params.user), wgULS(' 的对话页', ' 的對話頁') ]);

			query = {
				'title': 'User talk:' + self.params.user,
				'action': 'edit',
				'preview': 'yes',
				'vanarticle': self.params.pagename.replace(/_/g, ' '),
				'vanarticlerevid': self.params.revid,
				'vanarticlegoodrevid': self.params.goodid,
				'type': self.params.type,
				'count': self.params.count
			};

			switch (Twinkle.getPref('userTalkPageMode')) {
				case 'tab':
					window.open(mw.util.wikiScript('index') + '?' + $.param(query), '_blank');
					break;
				case 'blank':
					window.open(mw.util.wikiScript('index') + '?' + $.param(query), '_blank',
						'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800');
					break;
				case 'window':
				/* falls through */
				default:
					window.open(mw.util.wikiScript('index') + '?' + $.param(query),
						window.name === 'twinklewarnwindow' ? '_blank' : 'twinklewarnwindow',
						'location=no,toolbar=no,status=no,directories=no,scrollbars=yes,width=1200,height=800');
					break;
			}
		}

		query = {
			'action': 'edit',
			'title': self.params.pagename,
			'summary': summary,
			'token': edittoken,
			'undo': lastrevid,
			'undoafter': self.params.goodid,
			'basetimestamp': touched,
			'starttimestamp': starttimestamp,
			'watchlist': Twinkle.getPref('watchRevertedPages').indexOf(self.params.type) !== -1 ? 'watch' : undefined,
			'minor': Twinkle.getPref('markRevertedPagesAsMinor').indexOf(self.params.type) !== -1 ? true : undefined
		};

		Morebits.wiki.actionCompleted.redirect = self.params.pagename;
		Morebits.wiki.actionCompleted.notice = '回退完成';

		var wikipedia_api = new Morebits.wiki.api(wgULS('保存回退内容', '儲存回退内容'), query, Twinkle.fluff.callbacks.complete, self.statelem);
		wikipedia_api.params = self.params;
		wikipedia_api.post();

	},
	complete: function (apiobj) {
		var $edit = $(apiobj.getXML()).find('edit');
		var blacklist = $edit.attr('spamblacklist');
		if (blacklist) {
			var code = document.createElement('code');
			code.style.fontFamily = 'monospace';
			code.appendChild(document.createTextNode(blacklist));
			apiobj.statelem.error(['不能回退，因URL', code, wgULS('在垃圾黑名单中。', '在垃圾黑名單中。 ')]);
		} else if ($edit.attr('nochange') === '') {
			apiobj.statelem.warn(wgULS('要回退到的版本与当前版本相同，没什么要做的', '要回退到的版本與當前版本相同，沒什麼要做的'));
		} else {
			apiobj.statelem.info('完成');
		}
	}
};

// builtInString should contain the string "$USER", which will be replaced
// by an appropriate user link
Twinkle.fluff.formatSummary = function(builtInString, userName, userString) {
	var result = builtInString;

	// append user's custom reason with requisite punctuation
	if (userString) {
		result += '：' + Morebits.string.toUpperCaseFirstChar(userString);
		if (userString.search(/[。？！]$/) === -1) {
			result += '。';
		}
	} else {
		result += '。';
	}
	result += Twinkle.getPref('summaryAd');

	// find number of UTF-8 bytes the resulting string takes up, and possibly add
	// a contributions or contributions+talk link if it doesn't push the edit summary
	// over the 255-byte limit
	var resultLen = unescape(encodeURIComponent(result.replace('$USER', ''))).length;
	var contribsLink = '[[Special:Contributions/' + userName + '|' + userName + ']]';
	var contribsLen = unescape(encodeURIComponent(contribsLink)).length;
	if (resultLen + contribsLen <= 255) {
		var talkLink = ' ([[User talk:' + userName + wgULS('|讨论]])', '|討論]])');
		if (resultLen + contribsLen + unescape(encodeURIComponent(talkLink)).length <= 255) {
			result = result.replace('$USER', contribsLink + talkLink);
		} else {
			result = result.replace('$USER', contribsLink);
		}
	} else {
		result = result.replace('$USER', userName);
	}

	return result;
};

Twinkle.fluff.init = function twinklefluffinit() {
	if (Twinkle.userAuthorized) {
		// A list of usernames, usually only bots, that vandalism revert is jumped over; that is,
		// if vandalism revert was chosen on such username, then its target is on the revision before.
		// This is for handling quick bots that makes edits seconds after the original edit is made.
		// This only affects vandalism rollback; for good faith rollback, it will stop, indicating a bot
		// has no faith, and for normal rollback, it will rollback that edit.
		Twinkle.fluff.whiteList = [/*
			'AnomieBOT',
			'SineBot'
		*/];

		if (mw.util.getParamValue('twinklerevert')) {
			Twinkle.fluff.auto();
		} else {
			Twinkle.fluff.normal();
		}
	}
};
})(jQuery);


// </nowiki>
