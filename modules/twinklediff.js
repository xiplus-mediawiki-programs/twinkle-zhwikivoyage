// <nowiki>
// vim: set noet sts=0 sw=8:


(function($) {


/*
 ****************************************
 *** twinklediff.js: Diff module
 ****************************************
 * Mode of invocation:     Tab on non-diff pages ("Last"); tabs on diff pages ("Since", "Since mine", "Current")
 * Active on:              Existing non-special pages
 * Config directives in:   TwinkleConfig
 */

Twinkle.diff = function twinklediff() {
	if (mw.config.get('wgNamespaceNumber') < 0 || !mw.config.get('wgArticleId')) {
		return;
	}

	var query = {
		'title': mw.config.get('wgPageName'),
		'diff': 'cur',
		'oldid': 'prev'
	};

	Twinkle.addPortletLink(mw.util.wikiScript('index') + '?' + $.param(query), wgULS('最后', '最後'), 'tw-lastdiff', wgULS('显示最后修改', '顯示最後修改'));

	// Show additional tabs only on diff pages
	if (mw.util.getParamValue('diff')) {
		Twinkle.addPortletLink(function() {
			Twinkle.diff.evaluate(false);
		}, '自上', 'tw-since', wgULS('显示与上一修订版本间的差异', '顯示與上一修訂版本間的差異'));
		Twinkle.addPortletLink(function() {
			Twinkle.diff.evaluate(true);
		}, '自我', 'tw-sincemine', wgULS('显示与我做出的修订版本的差异', '顯示與我做出的修訂版本的差異'));

		var oldid = /oldid=(.+)/.exec($('#mw-diff-ntitle1').find('strong a').first().attr('href'))[1];
		query = {
			'title': mw.config.get('wgPageName'),
			'diff': 'cur',
			'oldid': oldid
		};
		Twinkle.addPortletLink(mw.util.wikiScript('index') + '?' + $.param(query), wgULS('当前', '當前'), 'tw-curdiff', wgULS('显示与当前版本间的差异', '顯示與當前版本間的差異'));
	}
};

Twinkle.diff.evaluate = function twinklediffEvaluate(me) {

	var user;
	if (me) {
		user = mw.config.get('wgUserName');
	} else {
		var node = document.getElementById('mw-diff-ntitle2');
		if (!node) {
			// nothing to do?
			return;
		}
		user = $(node).find('a').first().text();
	}
	var query = {
		'prop': 'revisions',
		'action': 'query',
		'titles': mw.config.get('wgPageName'),
		'rvlimit': 1,
		'rvprop': [ 'ids', 'user' ],
		'rvstartid': mw.config.get('wgCurRevisionId') - 1, // i.e. not the current one
		'rvuser': user
	};
	Morebits.status.init(document.getElementById('mw-content-text'));
	var wikipedia_api = new Morebits.wiki.api(wgULS('抓取最初贡献者信息', '抓取最初貢獻者訊息'), query, Twinkle.diff.callbacks.main);
	wikipedia_api.params = { user: user };
	wikipedia_api.post();
};

Twinkle.diff.callbacks = {
	main: function(self) {
		var xmlDoc = self.responseXML;
		var revid = $(xmlDoc).find('rev').attr('revid');

		if (!revid) {
			self.statelem.error(wgULS('未找到合适的早期版本，或 ', '未找到合適的早期版本，或 ') + self.params.user + wgULS(' 是唯一贡献者。取消。', ' 是唯一貢獻者。取消。 '));
			return;
		}
		var query = {
			'title': mw.config.get('wgPageName'),
			'oldid': revid,
			'diff': mw.config.get('wgCurRevisionId')
		};
		window.location = mw.util.wikiScript('index') + '?' + $.param(query);
	}
};
})(jQuery);


// </nowiki>
