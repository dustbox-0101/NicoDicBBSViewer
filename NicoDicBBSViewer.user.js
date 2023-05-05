// ==UserScript==
// @name          NicoDicBBSViewer 改造版
// @description   ニコニコ大百科のBBSの拡張
// @namespace     http://threeaster.nico
// @author        threeaster *** ほか (U+2042)
// @include       /^https?:\/\/dic\.nicovideo\.jp\/[a-z]\/.*$/
// @require       https://ajax.aspnetcdn.com/ajax/jQuery/jquery-3.6.4.slim.min.js
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_addElement
// @version       0.0.1
// ==/UserScript==

(function($){
	GM_addElement(document.getElementsByTagName('head')[0], 'style', {textContent: `
		.ID {text-decoration:underline; color:black; display:inline;}
		.IDMulti {text-decoration:underline; color:blue; display:inline;}
		.IDMany {text-decoration:underline; color:red; display:inline;}
		.Number {text-decoration:underline; display:inline;}
		.NumberMulti {text-decoration:underline; display:inline; color:blue;}
		.NumberMany {text-decoration:underline; display:inline; color:red;}
		.dic {display:inline;}
		.ID:hover, .IDMulti:hover, .IDMany:hover, .dic:hover {text-decoration:none;}
		.ID > div, .IDMulti > div, .IDMany > div, .dic > div, .Number > div, .NumberMulti > div, .NumberMany > div, .NumberHandle > div {display:none;}
		.ID:hover > div, .IDMulti:hover > div,  .IDMany:hover > div, .numTooltip:hover > div, 
		.Number:hover > div, .NumberMulti:hover > div, .NumberMany:hover > div, .NumberHandle:hover > div {
			color:black; display:inline; position:absolute; background:#f5f5b5;
			border:solid black 1px; padding:5px; font-size:8pt;
			overflow:auto; box-shadow:1px 1px; z-index:10000; font-weight:normal;
		}
		div.left-box {border:groove 1px gray; border-radius:5px; background-image:none;}
		#ng {display:none; background:#f0f0f0; padding:.3rem;}
		#ng article { display:flex; flex-wrap:wrap; }
		#ng article section { display:flex; flex-direction:column; width:calc(25% - 0.2rem); padding:.1rem; }
		#ng textarea { width:94%; height:10rem; }
		#topbarRightMenu #bbsLi.selected, #topbarRightMenu #ngLi.selected {display:none;}
		ul#sidemenu li {border:solid 1px; width:100px;}
		ul#sidemenu li.selected {color:red;}
		#contextMenu {background:#d4d0c8; color:#000000; display:none; position:absolute; list-style:none; padding-left:0px; box-shadow:1px 1px;}
		#contextMenu li {padding:.3rem; cursor:pointer;}
		#contextMenu li:hover {background:#0a246a; color:#ffffff;}
		.deleted {display:none;}
		#bbsViewerMenu {display:flex; flex-direction:column; align-items:center; width:11rem; font-size:.9rem;}
		#bbsViewerMenu label {display:block; cursor:pointer; color:#fff; margin-top:.7rem;}
		#bbsViewerMenu label span {display:inline-block; transform:rotate(90deg);}
		#bbsViewerMenu label span.opened {transform:rotate(180deg);}
		#bbsViewerMenu ul {display:none; background:#fff; border:solid #000; border-width:0 1px 1px 1px;}
		#bbsViewerMenu ul li {padding:0; background:#fff;}
		#bbsViewerMenu a {cursor:pointer; display:block; padding:.2rem .5rem;}
		#bbsViewerMenu a:hover {background:#0a246a; color:#ffffff;}
		#ngMenuControll{display:flex; justify-content:space-around;}
		.res_reaction.deleted { display:inherit; padding:0; }
		.res_reaction.deleted > * { display:none; }
	`});

	// NG文字列
	class GM_NGList {
		#_key = 'ng';
		#_values = [];
		constructor(key = '') {
			this.#_key += key;
			this.#_values = GM_getValue(this.#_key, '').split("\n").map(t => t.trim()).filter(t => t.length != 0);
		}
		#toString() { return this.#_values.join("\n"); }
		get getString() { return this.#toString(); }
		get getArray() { return this.#_values; }
		setValues(txt) {
			this.#_values = txt.split("\n").map(t => t.trim()).filter(t => t.length != 0);
			GM_setValue(this.#_key, this.#toString());
		}
		add(value) {
			this.#_values.push(value);
			this.setValues(this.#toString());
		}
		hasValue(value) { return (0 <= this.#_values.indexOf(value)); }
	}
	var ngid = new GM_NGList('id');
	var ngname = new GM_NGList('name');
	var ngword = new GM_NGList('word');
	var ngres = new GM_NGList('res');

	// チェックボックス
	class GM_BoolValue {
		#_key = '';
		#_value = true;
		constructor(key = '') {
			this.#_key = key;
			this.#_value = (GM_getValue(this.#_key, 'true') === 'true');
		}
		get value() { return this.#_value; }
		set value(val) {
			this.#_value = ((val === 'true') || (val === true));
			GM_setValue(this.#_key, this.#_value.toString());
		}
	}
	var seethroughNG = new GM_BoolValue('seethroughNG');
	var loadAll = new GM_BoolValue('loadAll');
	var addToOnePage = new GM_BoolValue('addToOnePage');
	var autoLoad = new GM_BoolValue('autoLoad');
	var useNG = new GM_BoolValue('useNG');
	var tooltipOnDicPage = new GM_BoolValue('tooltipOnDicPage');
	var showIDTooltip = new GM_BoolValue('showIDTooltip');
	var showResAnchorTooltip = new GM_BoolValue('showResAnchorTooltip');
	var showResNumberTooltip = new GM_BoolValue('showResNumberTooltip');
	var showResHandleTooltip = new GM_BoolValue('showResHandleTooltip');
	var classificationID = new GM_BoolValue('classificationID');
	var classificationResNumber = new GM_BoolValue('classificationResNumber');
	var switcherInTopMenu = new GM_BoolValue('switcherInTopMenu');

	// ------------------------------

	class UrlAnalyzer {
		#_nicoURL = "//dic.nicovideo.jp";
		get nowUrl() { return document.URL; }
		get inArticlePage() { return (this.nowUrl.indexOf(this.#_nicoURL + "/b/") === -1); }
		#getPageType(url) {
			if(url.indexOf(this.#_nicoURL) !== -1) {
				url = url.replace(this.#_nicoURL, "");
			}
			let parts = url.split("/");
			return (parts[1] === "b")? parts[2]: parts[1];
			// -->| #getPageType()
		}
		#getPageName(url) {
			let tp = this.#getPageType(url);
			if(tp !== undefined && url.indexOf(tp) !== -1) {
				url = url.split(tp + "/")[1];
			}
			url = url.split("/")[0];
			url = url.split(":")[0];
			url = url.split("#")[0];
			return url;
			// -->| #getPageName()
		}
		getBBSURLs(pager = $()) {
			if(pager.length <= 0) { return []; }
			let bbsURLs = [];
			let urls = pager.find('a').not('.navi').map(function() { return this.href; }).get();
			if(urls.length) {
				// ページあり
				let lastURLParts = urls.pop().split("/");
				let lastNumber = Number(lastURLParts.pop().replace("-", ""));
				if(!this.inArticlePage) {
					let nowURLParts = this.nowUrl.split("#")[0].split("/");
					let nowNumber = Number(nowURLParts.pop().replace("-", ""));
					lastNumber = (nowNumber <= lastNumber)? lastNumber: nowNumber;
				}
				let basicURL = lastURLParts.join("/") + "/";
				for(let i = lastNumber; i > 0; i -= 30) {
					bbsURLs.unshift(basicURL + i.toString() + "-");
				}
			} else {
				// ページなし
				let url = this.nowUrl;
				if(url.indexOf("#") !== -1) {
					url = url.substring(0, url.indexOf("#"));
					if(url.indexOf("-") < 0) { url += "-"; }
				}
				bbsURLs.push(url);
			}
			return bbsURLs;
			// -->| getBBSURLs()
		}
		isPageOf(url) {
			let nowUrl = this.nowUrl;
			let tp = this.#getPageType(url);
			let nowType = (tp !== undefined)? this.#getPageType(nowUrl): undefined;
			url = this.#getPageName(url);
			nowUrl = this.#getPageName(nowUrl);
			return ((tp === nowType) && (url === nowUrl));
			// -->| isPageOf()
		}
		getNowPageName() { return this.#getPageName(this.nowUrl); }
		getNowPageType() { return this.#getPageType(this.nowUrl); }
		changeNumber(url) {
			if(this.inArticlePage) {
				return url;
			} else {
				let parts = url.split("/");
				let last = parts.pop().split("-");
				let lastNum = last.shift();
				let lastTail = last.join("-");
				let base = parts.join("/");
				let nowNum = this.nowUrl.split("/").pop().split("-")[0];
				return base + "/" + nowNum + "-" + lastTail;
			}
			// -->| changeNumber()
		}
	}

	class Res {
		#_origin = {'num': 0, 'id': '', 'name': '', 'trip': '', 'text': '', 'body': $()};
		reshead;
		resbody;
		linkedResponds;
		#_urlAnalyzer;
		get urlAnalyzer() { return this.#_urlAnalyzer; }
		constructor($dt, $dd, ana = undefined) {
			if(($dt === undefined || $dt.length == 0) && ($dd === undefined || $dd.length == 0)) { throw new Error('Res:constructor ... 引数ないよー'); }
			this.reshead = $dt;
			this.resbody = $dd;
			this.#_urlAnalyzer = ana ?? new UrlAnalyzer();
			// レス番号
			this.#_origin.num = Number($dt.find('a[name]').eq(0).attr('name')) ?? 0;
			// ID + トリップ
			let $resinfo = $dt.find('.st-bbs_resInfo').eq(0).contents();
			let id = $resinfo.text().split(':').pop().split('[')[0];
			this.#_origin.id = id.trim();
			if($resinfo.has('span.trip')) {
				this.#_origin.trip = $resinfo.find('span.trip').text();
			}
			// 名前
			this.#_origin.name = $dt.find('.st-bbs_name').text();
			// 本文
			this.#_origin.body = $dd.clone(true).contents();
			this.#_origin.text = $dd.text();
		}
		get number() { return this.#_origin.num; }
		get id() { return this.#_origin.id; }
		get name() { return this.#_origin.name; }
		get trip() { return this.#_origin.trip; }
		get text() { return this.#_origin.text; }
		get body() { return this.#_origin.body; }
		makeIDDiv(resListById) {
			let reflectSameId = classificationID.value && (tooltipOnDicPage.value || !this.urlAnalyzer.inArticlePage);
			let addOrdinalAndTotal = function(res, sameIDRes) {
				if(reflectSameId) {
					return '['+ (sameIDRes.indexOf(res) + 1) +'/'+ sameIDRes.length +']';
				}
				return '';
			}
			let insertFractionIntoDiv = function(html, fraction) {
				return html.replace('</div>', fraction +'</div>');
			}
			let sameIDRes = resListById[this.id];
			let addIDMulti = 'ID';
			let addIDMany = 'ID';
			if(reflectSameId) {
				addIDMulti += 'Multi';
				addIDMany += 'Many';
			}
			const IDCLASSES = ['ID', 'IDMulti', 'IDMany'];
			const D_IDCLASSES = IDCLASSES.map(v => '.'+ v).join(', ');
			if(this.reshead.find(D_IDCLASSES).length === 0) {
				// 初期設定
				let s = this.reshead.html().split(':');
				s[s.length - 2] = s[s.length - 2].replace('ID', '<div class="ID">ID</div>');
				if(sameIDRes.length !== 1) {
					if(sameIDRes.length < 5) {
						// 青 (5回以内)
						s[s.length - 2] = s[s.length - 2].replace('class="ID"', 'class="'+ addIDMulti +'"');
						s[s.length - 1] = insertFractionIntoDiv(s[s.length - 1], addOrdinalAndTotal(this, sameIDRes));
					} else {
						// 赤 (5回以上)
						s[s.length - 2] = s[s.length - 2].replace('class="ID"', 'class="'+ addIDMany +'"');
						s[s.length - 1] = insertFractionIntoDiv(s[s.length - 1], addOrdinalAndTotal(this, sameIDRes));
					}
				}
				this.reshead.html(s.join(':'));
				// -->|
			} else if(this.reshead.find('.ID').length !== 0) {
				if(sameIDRes.length !== 1) {
					if(sameIDRes.length < 5) {
						this.reshead.find(D_IDCLASSES).removeClass(IDCLASSES).addClass(addIDMulti);
					} else {
						this.reshead.find(D_IDCLASSES).removeClass(IDCLASSES).addClass(addIDMany);
					}
					let s = this.reshead.html().split(':');
					s[s.length - 1] = insertFractionIntoDiv(s[s.length - 1], addOrdinalAndTotal(this, sameIDRes));
					this.reshead.html(s.join(':'));
				}
				// -->|
			} else {
				if(sameIDRes.length < 5) {
					this.reshead.find(D_IDCLASSES).removeClass(IDCLASSES).addClass(addIDMulti);
				} else {
					this.reshead.find(D_IDCLASSES).removeClass(IDCLASSES).addClass(addIDMany);
				}
				let s = this.reshead.html().split('[');
				s[s.length - 1] = addOrdinalAndTotal(this, sameIDRes);
				this.reshead.html(s.join(''));
			}
			// -->| makeIDDiv()
		}
		makeNumberDiv(resList) {
			this.linkedResponds = [];
			let myNumber = this.number;
			for(let i = 0; i < resList.length; i++) {
				let numberAnchorsWrapset = resList[i].resbody.find('a.dic');
				let numberAnchors = [];
				if(numberAnchorsWrapset.length == 0) {
					continue;
				}
				numberAnchorsWrapset.each(function() { numberAnchors.push($(this).html().split("&gt;").join('')); });
				for(let j = 0; j < numberAnchors.length; j++) {
					let num = numberAnchors[j];
					if(num.indexOf('-') === -1 && myNumber === Number(num)) {
						this.linkedResponds.push(resList[i]);
						break;
					} else {
						num = num.split('-');
						if(Number(num[0]) <= myNumber && myNumber <= Number(num[1])) {
							this.linkedResponds.push(resList[i]);
							break;
						}
					}
				}
			}
			this.reshead.find('div.Number, div.NumberMulti, div.NumberMany').contents().unwrap();
			if(this.linkedResponds.length !== 0) {
				const N = 'Number';
				const cls = '.st-bbs_resNo';
				let $div = $('<div>').addClass(N).html(this.reshead.find(cls).html());
				if(!classificationResNumber.value || this.linkedResponds.length == 1) {
					this.reshead.find(cls).html('').append($div);
				} else if(this.linkedResponds.length <= 3) {
					this.reshead.find(cls).html('').append($div.removeClass(N).addClass(N + 'Multi'));
				} else {
					this.reshead.find(cls).html('').append($div.removeClass(N).addClass(N + 'Many'));
				}
			}
			// -->| makeNumberDiv()
		}
		#adjustHeightOfTooltip(tooltip) {
			const _H = $('#header').offset().top;
			let a = $('html').scrollTop() + _H;
			let b = tooltip.offset().top;
			let c = $(window).height() - _H;
			let d = tooltip.height();
			if((a < b) && (b < a+c) && (a < b+d) && (b+d < a+c)) {
				// noop
			} else if(d < c) {
				if(b > a) {
					tooltip.offset({top: (a + c - d)});
				} else {
					tooltip.offset({top: a});
				}
			} else {
				tooltip.offset({top: a});
				tooltip.height(c - _H);
			}
			// -->| #adjustHeightOfTooltip()
		}
		makeIDTooltip(resListById) {
			let sameIDRes = resListById[this.id];
			let $divID = this.reshead.find('div[class^="ID"]');
			let self = this;
			$divID.off('mouseenter').off('mouseleave').on('mouseenter', function() {
				let $tooltip = $('<div>').on('click', function(e) { e.stopPropagation(); });
				for(const _res of sameIDRes) {
					$tooltip.append(_res.reshead.clone().find('a').removeAttr('id').end());
					$tooltip.append(_res.resbody.clone().find('a').removeAttr('id').end());
				}
				//$divID.append($tooltip).trigger('focus');
				$(this).append($tooltip).trigger('focus');
				self.#adjustHeightOfTooltip($tooltip);
			}).on('mouseleave', function() { $divID.find('div').remove(); });
			// -->| makeIDTooltop()
		}
		makeNumTooltip(resListByNumber) {
			let self = this;
			this.resbody.find('.numTooltip > a.dic').unwrap();
			this.resbody.find('a.dic').filter(function() { return ($(this).html().indexOf("&gt;&gt;") !== -1); }).each(function() {
				let $self = $(this);
				let num = $self.html().split("&gt;").join("").split("-");
				$self.wrap($('<span>').addClass('numTooltip')).parent().off('mouseenter').off('mouseleave').on('mouseenter', function() {
					let $self = $(this);
					let $tooltip = $('<div>');
					if(num.length ===1 || !num[1]) {
						let res = resListByNumber[num[0]];
						if(res === undefined) { return; }
						let _body = res.resbody.clone();
						_body.find('.numTooltip > a.dic').unwrap();
						$tooltip.append(res.reshead.clone().find('a').removeAttr('id').end());
						$tooltip.append(_body.find('a').removeAttr('id').end());
					} else {
						for(let i = num[0]; i <= num[1]; i++) {
							let res = resListByNumber[i];
							if(res === undefined) { continue; }
							let _body = res.resbody.clone();
							_body.find('.numTooltip > a.dic').unwrap();
							$tooltip.append(res.reshead.clone().find('a').removeAttr('id').end());
							$tooltip.append(_body.find('a').removeAttr('id').end());
						}
						// 個数チェック
						if($tooltip.html() === $('<div>').html()) { return; }
					}
					$self.append($tooltip).trigger('focus');
					self.#adjustHeightOfTooltip($tooltip);
					// -->| .on(mouseenter)
				}).on('mouseleave', function() { $(this).find('div').remove(); });
			});
			// -->| makeNumTooltip()
		}
		makeLinkedNumberTooltip() {
			let $divNumber = this.reshead.find('div[class^="Number"]');
			let linkedResponds = this.linkedResponds;
			let self = this;
			$divNumber.off('mouseenter').off('mouseleave').on('mouseenter', function() {
				let $tooltip = $('<div>').on('click', function(e) { e.stopPropagation(); });
				for(const respond of linkedResponds) {
					$tooltip.append(respond.reshead.clone().find('a').removeAttr('id').end());
					$tooltip.append(respond.resbody.clone().find('a').removeAttr('id').end());
				}
				$divNumber.append($tooltip).trigger('focus');
				self.#adjustHeightOfTooltip($tooltip);
			}).on('mouseleave', function() { $divNumber.find('div').remove(); });
			// -->| makeLinkedNumberTooltip()
		}
		makeNumberHandleTooltip(resListByNumber) {
			let $nameSpan = this.reshead.find('.st-bbs_name');
			let _name = $nameSpan.html();
			let transformedName = _name.replace(/[０１２３４５６７８９]/g, function(c) { return "０１２３４５６７８９".indexOf(c); });
			let self = this;
			if(/^[0-9]+$/.test(transformedName)) {
				$nameSpan.wrap('<span class="NumberHandle">').parent().off('mouseenter').off('mouseleave').on('mouseenter', function() {
					let $self = $(this);
					let $tooltip = $('<div>');
					let res = resListByNumber[transformedName];
					if(res === undefined) { return; }
					$tooltip.append(res.reshead.clone().find('a').removeAttr('id').end());
					$tooltip.append(res.resbody.clone().find('a').removeAttr('id').end());
					$self.append($tooltip).trigger('focus');
					self.#adjustHeightOfTooltip($tooltip);
				}).on('mouseleave', function() { $(this).find('div').remove(); });
			}
			// -->| makeNumberHandleTooltip()
		}
	}

	class ResCollection {
		#_urlAnalyzer;
		#_resList = [];
		#_resListById = {};
		#_resListByNumber = [];
		get urlAnalyzer() { return this.#_urlAnalyzer; }
		get resList() { return this.#_resList; }
		get resListById() { return this.#_resListById; }
		get resListByNumber() { return this.#_resListByNumber; }
		constructor(ana) {
			this.#_urlAnalyzer = ana ?? new UrlAnalyzer();
		}
		createResList($dl) {
			if($dl === undefined || $dl.length == 0) { throw new Error('ResCollection:createResList ... 引数ないよー'); }
			$dl.find('dt').each(function() {
				let self = $(this);
				self.attr('data-number', self.find('a').eq(0).attr('name'));
				self.attr('data-name', self.find('.st-bbs_name').text());
				let id = self.find('.st-bbs_resInfo').eq(0).text().split(":").pop();
				id = id.split("[")[0];
				self.attr('data-id', id);
			});
			let resheads = $dl.find('dt.st-bbs_reshead');
			let resbodies = $dl.find('dd.st-bbs_resbody');
			this.#_resList = new Array(resheads.length);
			for(let i = 0; i < resheads.length; i++) {
				this.#_resList[i] = new Res(resheads.eq(i), resbodies.eq(i), this.urlAnalyzer);
			}
			// -->| createResList()
		}
		createResListById() {
			this.#_resListById = {};
			for(const res of this.resList) {
				if(!this.resListById[res.id]) { this.#_resListById[res.id] = []; }
				this.#_resListById[res.id].push(res);
			}
			// -->| createResListById()
		}
		createResListByNumber() {
			this.#_resListByNumber = [];
			for(const res of this.resList) {
				this.#_resListByNumber[res.number] = res;
			}
			// -->| createResListByNumber()
		}
		makeTooltips() {
			let noMake = (!tooltipOnDicPage.value && this.urlAnalyzer.inArticlePage);
			for(const res of this.resList) {
				res.makeIDDiv(this.resListById, !noMake);
				res.makeNumberDiv(this.resList);
				if(noMake) { continue; }
				if(showIDTooltip.value) { res.makeIDTooltip(this.resListById); }
				if(showResAnchorTooltip.value) { res.makeNumTooltip(this.resListByNumber); }
				if(showResNumberTooltip.value) { res.makeLinkedNumberTooltip(); }
				if(showResHandleTooltip.value) { res.makeNumberHandleTooltip(this.resListByNumber); }
			}
			// -->| makeTooltips()
		}
		showRes() {
			let dl = $('.st-bbs-contents dl');
			for(const res of this.resList) {
				dl.append(res.reshead);
				dl.append(res.resbody);
			}
			// -->| showRes()
		}
		revivalAllRes(className) {
			for(const res of this.resList) {
				if(res.reshead.hasClass(className)) {
					res.reshead.removeClass(className).find('.st-bbs_name').html(res.name);
					if(res.reshead.find('.trip').length !== 0) {
						res.reshead.find('.trip').removeClass(className).html(res.trip);
					}
					res.resbody.html("").append(res.body).removeClass(className);
				}
			}
			// -->| revivalAllRes()
		}
		setContextMenu() {
			for(const res of this.resList) {
				res.reshead.find('.ID, .IDMulti, .IDMany').off('click').on('click', function(e) {
					$(this).closest('.st-bbs_resInfo').append($('#contextMenu').css({left: e.pageX, top: e.pageY}).show());
					e.stopPropagation();
				});
			}
			$('html').off('click').on('click', function() { $('#contextMenu').hide(); });
			// -->| setContextMenu()
		}
	}

	class NgOperator {
		#_GM_replaceKey = 'ngReplaceText';
		#_replaceText = '削除しました';
		#_cls = 'deleted';
		#_urlAnalyzer;
		get urlAnalyzer() { this.#_urlAnalyzer; }
		get className() { return this.#_cls; }
		get replaceText() { return this.#_replaceText; }
		get defaultClassName() { return 'deleted'; }
		constructor(ana) {
			this.#_urlAnalyzer = ana ?? new UrlAnalyzer();
			this.#_replaceText = GM_getValue(this.#_GM_replaceKey, '削除しました');
			if(!seethroughNG.value) { this.#_cls += '_visible'; }
		}
		applyNg(resList) {
			for(let r of resList) {
				let applied = false;
				if(useNG.value) {
					// NG確認
					if(ngid.hasValue(r.id)) { applied = true; }
					if(ngname.hasValue(r.name)) { applied = true; }
					if(ngname.hasValue(r.trip)) { applied = true; }
					if(ngword.getArray.some(t => (r.text.indexOf(t) !== -1))) { applied = true; }
					for(const res of ngres.getArray) {
						let _ngres = res.split(":");
						let number = Number(_ngres.pop());
						let URL = _ngres.join(":");
						if(this.urlAnalyzer.isPageOf(URL) && (r.number == number)) { applied = true; }
					}
				}
				if(applied) {
					// NG設定
					$('#contextMenu').insertAfter('#ng');
					r.reshead.find('.st-bbs_name').html(this.replaceText);
					r.reshead.find('.trip').removeClass(this.defaultClassName).addClass(this.className);
					if(seethroughNG.value) { r.reshead.find('.trip').html(''); }
					r.reshead.removeClass(this.defaultClassName).addClass(this.className);
					r.resbody.html(this.replaceText).removeClass(this.defaultClassName).addClass(this.className);
					r.resbody.next('.res_reaction').addClass('deleted');
				} else if(r.reshead.hasClass(this.className)) {
					// NG解除
					r.reshead.removeClass(this.className).find('.st-bbs_name').html(r.name);
					r.resbody.html('').append(r.body).removeClass(this.className);
					r.resbody.next('.res_reaction').removeClass('deleted');
				}
			}
			// -->| applyNg()
		}
	}

	class MenuOperator {
		#_resCollection;
		#_ngOperator;
		#_urlAnalyzer;
		bbsScroll = 0;
		get resCollection() { return this.#_resCollection; }
		get ngOperator() { return this.#_ngOperator; }
		get urlAnalyzer() { return this.#_urlAnalyzer; }
		constructor(resCollection, ngOperator) {
			if(resCollection === undefined || ngOperator === undefined) { throw new Error('MenuOperator:constructor ... 引数ないよー'); }
			this.#_resCollection = resCollection;
			this.#_ngOperator = ngOperator;
			this.#_urlAnalyzer = new UrlAnalyzer();
			this.bbsScroll = $('#bbs').offset().top;
		}
		bindContextMenu() {
			let self = this;
			$('#ngidMenu').off('click').on('click', function() {
				$('#contextMenu').hide();
				if($(this).closest('.st-bbs_reshead').hasClass(self.ngOperator.className)) { return false; }
				// ID追加
				let id = $(this).closest('.st-bbs_reshead').attr('data-id');
				ngid.add(id);
				$('#ngidTextarea').val(ngid.getString);
				self.ngOperator.applyNg(self.resCollection.resList);
			});
			//
			$('#ngnameMenu').off('click').on('click', function() {
				$('#contextMenu').hide();
				if($(this).closest('.st-bbs_reshead').hasClass(self.ngOperator.className)) { return false; }
				// 名前追加
				let name = $(this).closest('.st-bbs_reshead').attr('data-name');
				ngname.add(name);
				$('#ngnameTextArea').val(ngname.getString);
				self.ngOperator.applyNg(self.resCollection.resList);
			});
			//
			$('#ngresMenu').off('click').on('click', function() {
				$('#contextMenu').hide();
				if($(this).closest('.st-bbs_reshead').hasClass(self.ngOperator.className)) { return false; }
				// レス追加
				let pageName = self.urlAnalyzer.getNowPageName();
				let number = $(this).closest('.st-bbs_reshead').attr('data-number');
				ngres.add(pageName + ":" + number);
				$('#ngresTextarea').val(ngres.getString);
				self.ngOperator.applyNg(self.resCollection.resList);
			});
			// -->| bindContextMenu()
		}
		insertConfigHtml() {
			let self = this;
			let appendNgTextarea = function(labelcore, idcore) {
				let $div = $('<section>');
				let $label = $('<p>').text("改行で区切って" + labelcore + "を入力or削除してください。");
				let $textarea = $('<textarea>').attr({id: idcore + 'Textarea', placeholder: labelcore + 'を改行で区切って入力してください。'});
				$textarea.val(eval(idcore + '.getString'));
				$div.append($label).append($textarea);
				$('#ng > article').append($div);
			}
			let appendConfigLi = function(parent, id, label) {
				let $li = $('<li>');
				let $input = $('<input>').attr({type: 'checkbox', id: id + 'Checkbox'});
				if(eval(id + '.value')) { $input.attr('checked', 'checked'); }
				$li.append($input).append(label);
				parent.append($li);
			}
			let appendSubList = function(parent, list, label) {
				let $li = $('<li>').text(label);
				$li.append(list);
				parent.append($li);
			}
			let getSubUl = function() { return $('<ul>').css({listStyleType: 'none', marginLeft: '5px'}); }
			// 設定トグル
			let $link = $('<li>').append($('<a>').attr('href', '#'));
			let $nav = $('<ul>').append($link.clone().attr('id', 'bbsLi').addClass('selected')).append($link.clone().attr('id', 'ngLi'));
			$nav.find('#bbsLi a').text('掲示板を表示する');
			$nav.find('#ngLi a').text('設定画面を表示する');
			$('#basebody').append($('<nav>').attr('id', 'bbsViewerMenu'));
			$('#bbsViewerMenu').append($('<label>').text('NicoDicBBSViewer ').append($('<span>').text('≫'))).append($nav);
			$('#bbsViewerMenu label').on('click', function() {
				$(this).find('span').toggleClass('opened');
				$(this).siblings('ul').toggle();
			});
			
			// 設定画面
			$('.st-bbs-contents').after($('<div>').attr('id', 'ng'));
			$('#ng').append('<article>');
			appendNgTextarea('NGID', 'ngid');
			appendNgTextarea('NGName', 'ngname');
			appendNgTextarea('NGワード', 'ngword');
			appendNgTextarea('NGレスを(BBSのURL:レス番号)の書式で', 'ngres');

			let $form = $('<form>').append($('<ul>').css('list-style-type', 'none'));
			$('#ng').append($('<div>').css('clear', 'left').append($form));
			let parentUl = $('#ng form ul');
			let ngUl = getSubUl();
			appendConfigLi(ngUl, "useNG", "NG機能を使用する");
			appendConfigLi(ngUl, "seethroughNG", "NGが適用されたレスを表示しない");
			appendSubList(parentUl, ngUl, "NG機能");

			appendConfigLi(parentUl, "tooltipOnDicPage", "記事ページでもID、番号の色分けやツールチップを表示する");

			let tooltipUl = getSubUl();
			appendConfigLi(tooltipUl, "showIDTooltip", 'ID(<span style="text-decoration:underline;">ID</span>)ツールチップを表示する');
			appendConfigLi(tooltipUl, "showResAnchorTooltip", 'レスアンカー(<span style="color: rgb(0, 102, 204);">>>1</span>)ツールチップを表示する');
			appendConfigLi(tooltipUl, "showResNumberTooltip", 'レス番(<span style="text-decoration:underline;">1</span>)ツールチップを表示する');
			appendConfigLi(tooltipUl, "showResHandleTooltip", 'レス番ハンドル(<span style="color: rgb(0, 136, 0); font-weight: bold;">1</span>)ツールチップを表示する');
			appendSubList(parentUl, tooltipUl, "ツールチップ(更新時有効)");

			let colorUl = getSubUl();
			appendConfigLi(colorUl, "classificationID", "IDを色分けし、そのIDのレスの回数を表示する");
			appendConfigLi(colorUl, "classificationResNumber", "参照されているレス番を色分けする");
			appendSubList(parentUl, colorUl, "色分け(更新時有効)");

			$('#ng').append($('<div>').attr('id', 'ngMenuControll'));
			$('#ngMenuControll').append($('<button>').attr('id', 'decideNG').text('保存'));
			$('#ngMenuControll').append($('<button>').attr('id', 'cancelNG').text('キャンセル'));
			$('#ngMenuControll').append($('<button>').attr('id', 'backToBbsButton').text('掲示板に戻る'));

			// 個別
			let $ngControll = $('<ul>').attr('id', 'contextMenu');
			$ngControll.append($('<li>').attr('id', 'ngidMenu').text('NGIDに追加'));
			$ngControll.append($('<li>').attr('id', 'ngnameMenu').text('NGNameに追加'));
			$ngControll.append($('<li>').attr('id', 'ngresMenu').text('このレスを削除'));
			$('#ng').after($ngControll);

			$('#ng').on('toggle.visible', function(e) {
				e.stopPropagation();
				$(e.currentTarget).find('textarea').each(function() {
					let v = eval($(this).attr('id').replace('Textarea', ''));
					$(this).val(v.getString);
				});
			});
			// -->| insertConfigHtml()
		}
		bindMenu() {
			let self = this;
			let $contents = $('.st-bbs-contents, #ng');
			let backBBS = function(e) {
				$('.selected').removeClass('selected');
				$('#bbsLi').addClass('selected');
				$contents.not('.st-bbs-contents').css('display', 'none');
				$('.st-bbs-contents').css('display', 'block');
				$('html').scrollTop(self.bbsScroll);
				e.stopPropagation();
				return false;
			}
			$('#bbsLi').on('click', backBBS).on('click', function(e) {
				$('#bbsViewerMenu label').trigger('click');
				e.stopPropagation();
			});
			$('#backToBbsButton').on('click', backBBS);

			$('#ngLi').on('click', function(e) {
				$('.selected').removeClass('selected');
				$(this).addClass('selected');
				$contents.not('#ng').css('display', 'none');
				$('#ng').css('display', 'block').trigger('toggle.visible');
				$('html').scrollTop(self.bbsScroll);
				$('#bbsViewerMenu label').trigger('click');
				e.stopPropagation();
				return false;
			});

			let setcbConfig = function(id) {
				eval(id + '.value = ' + $('#' + id + 'Checkbox').is(':checked'));
			}
			let checkcbConfig = function(id) {
				$('#' + id + 'Checkbox').prop('checked', eval(id + '.value'));
			}

			$('#decideNG').on('click', function(e) {
				e.stopPropagation();
				// テキストエリア類
				$('#ng').find('textarea').each(function() {
					let v = eval($(this).attr('id').replace('Textarea', ''));
					v.setValues($(this).val());
				});
				// チェックボックス類
				setcbConfig("seethroughNG");
				setcbConfig("loadAll");
				setcbConfig("addToOnePage");
				setcbConfig("autoLoad");
				setcbConfig("useNG");
				setcbConfig("tooltipOnDicPage");
				setcbConfig("showIDTooltip");
				setcbConfig("showResAnchorTooltip");
				setcbConfig("showResNumberTooltip");
				setcbConfig("showResHandleTooltip");
				setcbConfig("classificationID");
				setcbConfig("classificationResNumber");
				setcbConfig("switcherInTopMenu");
				self.ngOperator.applyNg(self.resCollection.resList);
			});

			$('#cancelNG').on('click', function(e) {
				e.stopPropagation();
				// テキストエリア類
				$('#ng').find('textarea').each(function() {
					let v = eval($(this).attr('id').replace('Textarea', ''));
					$(this).val(v.getString);
				});
				// チェックボックス類
				checkcbConfig("seethroughNG");
				checkcbConfig("loadAll");
				checkcbConfig("addToOnePage");
				checkcbConfig("autoLoad");
				checkcbConfig("useNG");
				checkcbConfig("tooltipOnDicPage");
				checkcbConfig("showIDTooltip");
				checkcbConfig("showResAnchorTooltip");
				checkcbConfig("showResNumberTooltip");
				checkcbConfig("showResHandleTooltip");
				checkcbConfig("classificationID");
				checkcbConfig("classificationResNumber");
				checkcbConfig("switcherInTopMenu");
			});
			// -->| bindMenu()
		}
	}

	class ManagerToReadBbs {
		#_urlAnalyzer;
		#_resCollection;
		#_ngOperator;
		#_menuOperator;
		#_bbsUrls = [];
		#_$loading = $('<p>').attr('id', 'loading').text('now loading...');
		reserved = false;
		startIndex = 0;
		endIndex = 0;
		isLoading = false;
		get urlAnalyzer() { return this.#_urlAnalyzer; }
		get resCollection() { return this.#_resCollection; }
		get ngOperator() { return this.#_ngOperator; }
		get menuOperator() { return this.#_menuOperator; }
		get bbsUrls() { return this.#_bbsUrls; }
		get $loading() { return this.#_$loading.clone(); }
		constructor(urls = [], ana) {
			this.#_urlAnalyzer = ana ?? new UrlAnalyzer();
			this.#_bbsUrls = urls;
			let nowUrl = this.urlAnalyzer.nowUrl;
			if(!this.urlAnalyzer.inArticlePage) {
				if(nowUrl.indexOf("#") === -1) {
					this.startIndex = this.bbsUrls.indexOf(nowUrl);
				} else {
					let mainUrl = nowUrl.substring(0, nowUrl.indexOf("#"));
					if(mainUrl.indexOf("-") === -1) { mainUrl += "-"; }
					this.startIndex = this.bbsUrls.indexOf(mainUrl);
				}
			}
			this.endIndex = this.startIndex;
			this.isLoading = false;
			this.#_resCollection = new ResCollection(this.urlAnalyzer);
			this.#_ngOperator = new NgOperator(this.urlAnalyzer);
			this.#_menuOperator = new MenuOperator(this.resCollection, this.ngOperator);
		}
		createAndSetResList() {
			this.resCollection.createResList($('.st-bbs-contents dl'));
			this.resCollection.createResListById()
			this.resCollection.createResListByNumber();
			this.resCollection.makeTooltips();
			this.resCollection.setContextMenu();
			this.ngOperator.applyNg(this.resCollection.resList);
			// -->| createAndSetResList()
		}
		#prependBbs($dl = $()) {
			this.resCollection.revivalAllRes(this.ngOperator.className);
			$('.st-bbs-contents dl').prepend($dl.contents());
			this.createAndSetResList();
			$('#loading').remove();
			this.isLoading = false;
			// -->| #prepentBbs()
		}
		readPreviousBbs() {
			if(this.isLoading || this.startIndex <= 0) { return; }
			$('.bbsmain').first().prepend(this.$loading);
			this.isLoading = true;
			this.startIndex--;

			let self = this;
			$.get(this.bbsUrls[this.startIndex], function(_html) { self.#prependBbs($(_html).find('.st-bbs-contents dl')); });
			if(this.startIndex === 0) { $('#loadPreviousPageLinks').remove(); }
			// -->| readPreviousBbs()
		}
		#appendBbs($dl = $()) {
			this.resCollection.revivalAllRes(this.ngOperator.className);
			$('.st-bbs-contents dl').append($dl.contents());
			this.createAndSetResList();
			$('#loading').remove();
			this.isLoading = false;
			// -->| #appendBbs()
		}
		readNextBbs() {
			if(this.isLoading || (this.endIndex >= this.bbsUrls.length - 1)) { return; }
			$('.bbsmain').last().append(this.$loading);
			this.isLoading = true;
			this.endIndex++;

			let self = this;
			$.get(this.bbsUrls[this.endIndex], function(_html) { self.#appendBbs($(_html).find('.st-bbs-contents dl')); });
			if(this.endIndex === this.bbsUrls.length - 1) { $('#loadNextPageLinks').remove(); }
			// -->| readNextBbs()
		}
		initPager() {
			if(!addToOnePage.value) { return; }
			let $pager = $('.st-bbs-contents .st-pg_contents');
			let self = this;
			if(this.urlAnalyzer.inArticlePage) {
				$pager.find('.navi').remove();
			} else {
				$pager.empty();
				if(0 < this.startIndex) {
					$pager.first().append($('<a>').attr({id: 'loadPreviousPageLinks', href: '#'}).text('前へ'));
					$pager.find('#loadPreviousPageLinks').on('click', function(e) {
						e.stopPropagation();
						self.readPreviousBbs();
						return false;
					});
				}
				if(this.endIndex < this.bbsUrls.length - 1) {
					$pager.last().append($('<a>').attr({id: 'loadNextPageLinks', href: '#'}).text('次へ'));
					$pager.find('#loadNextPageLinks').on('click', function(e) {
						e.stopPropagation();
						self.readNextBbs();
						return false;
					});
				}
			}
			// -->| initPager()
		}
		scrollLoader() {
			this.reserved = false;
			let self = this;
			setInterval(function() {
				if(self.reserved) {
					self.reserved = false;
					self.readNextBbs();
				}
			}, 1000);
			$(window).scroll(function() {
				let windowHeight = $('html').scrollTop() + $(window).height();
				let bbsHeight = $('.bbsmain').first().position().top;
				$('.st-bbs-contents').children(':not(.st-pg)').each(function() { bbsHeight += $(this).height(); });
				if(($('.selected').attr('id') === 'bbsLi') && autoLoad.value && (windowHeight > bbsHeight)) { self.reserved = true; }
			});
			// -->| scrollLoader()
		}
		initSmallBbs() {
			//this.initPager();
			this.createAndSetResList();
			this.menuOperator.insertConfigHtml();
			this.menuOperator.bindMenu();
			this.menuOperator.bindContextMenu();
			// -->| initSmallBbs()
		}
	}

	var counterAutopagerize = function() {
		$(document).on('AutoPagerize_DOMNodeInserted', function() {
			$('[class^="autopagerize"], dl:not(.bbsmain), #autopagerize_message_bar').remove();
		});
	};

	var main = function(ana) {
		let analyzer = ana ?? new UrlAnalyzer();
		$('.st-bbs-contents dl').addClass('bbsmain');
		$('.border').remove();

		let manager = new ManagerToReadBbs(analyzer.getBBSURLs($('.st-bbs-contents .st-pg_contents').first()), analyzer);
		manager.initSmallBbs();
		counterAutopagerize();
		//if(!analyzer.inArticlePage) { manager.scrollLoader(); }

		let intervalID;
		intervalID = setInterval(function() {
			if($('#CommonHeader').find('div').length > 3) {
				let $header = $('.nico-CommonHeaderRoot').children().children().children().last();
				$('#bbsViewerMenu').prependTo($header);
				manager.menuOperator.bbsScroll = $('#bbs').offset().top;
				clearInterval(intervalID);
			}
		}, 500);
	};

	// =============== main実行 =======================================================
	if(typeof GM_getValue === 'function') { main(); }

})(jQuery);
