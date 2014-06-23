describe("", function(){
	var c;
	var $;
	var GM_value;
	beforeEach(function(){
		c = net_threeaster_NicoDicBBSViewer;
		$ = jQuery;
		GM_value = {};
		GM_setValue = function(name, value){
			GM_value[name] = value;
		};
		GM_getValue = function(name){
			return GM_value[name];
		};
		jasmine.addMatchers({
			toEqualAsUrl: function(util, customEqualityTesters){
				return{
					compare: function(actual, expected){
						if(actual.indexOf("://") !== -1){
							actual = actual.split("://")[1];
						}
						if(expected.indexOf("://")!== -1){
							expected = expected.split("://")[1];
						}
						var pass = actual === expected;
						var message = "";
						if(pass){
							message = actual + "is not expected " + expected;
						}else{
							message = actual + "is expected " + expected;
						}
						var result = {};
						result.pass = pass;
						result.message = message;
						return result;
					}
				};
			}
		});
	});

	afterEach(function(){
		GM_value = {};
	});

	var constructDl = function(reshead, resbody){
		var html = "<dl>";
		for(var i = 0; i < reshead.length; i++){
			html = html + reshead[i] + resbody[i];
		}
		html = html + "</dl>";
		return html;
	}

	describe("initConfigのテスト", function(){
		it("引数に与えられたidたちの中で定義されていないものをtrueにする", function(){
			//setUp
			var id1 = "id1";
			var id2 = "id2";
			//exercise
			c.initConfig([id1, id2]);
			//verify
			expect(GM_getValue(id1)).toEqual(true);
			expect(GM_getValue(id2)).toEqual(true);
		});

		it("引数に与えられたidが定義されていたならば変更しない", function(){
			//setUp
			var id1 = "id1";
			var id2 = "id2";
			GM_setValue(id1, true);
			GM_setValue(id2, false);
			//exercise
			c.initConfig([id1, id2]);
			//verify
			expect(GM_getValue(id1)).toEqual(true);
			expect(GM_getValue(id2)).toEqual(false);
		});
	});	

	describe("removeUselessLinesのテスト", function(){
		it("空文字列ならばundefinedが返される", function(){	//空文字列を返したほうが良いかも
			//setUp
			var argument = "";
			//exercise
			var actual = c.removeUselessLines(argument);
			//verify
			expect(actual).toEqual(undefined);
		});

		it("空行が含まれるとき空行が削除される", function(){
			//setUp
			var argument = "あ\n\nい\n";
			//exercise
			var actual = c.removeUselessLines(argument);
			//verify
			expect(actual).toEqual("あ\nい");
		});

		it("重複行が含まれるとき重複が削除される", function(){
			//setUp
			var argument = "あ\nい\nあ";
			//exercise
			var actual = c.removeUselessLines(argument);
			//verify
			expect(actual).toEqual("あ\nい");
		});
	});

	describe("initNGのテスト", function(){
		beforeEach(function(){
			spyOn(c, "removeUselessLines").and.callFake(function(v){
				return v;
			});
		});

		it("ngがGMに登録されている時、それをnglistに配列として登録する", function(){
			//setUp
			var ngid = ["ngid1", "ngid2"];
			var ngname = ["ngname1", "ngname2"];
			var ngword = ["ngword1", "ngword2"];
			var ngres = ["ngres1", "ngres2"];
			GM_setValue("ngid", ngid.join("\n"));
			GM_setValue("ngname", ngname.join("\n"));
			GM_setValue("ngword", ngword.join("\n"));
			GM_setValue("ngres", ngres.join("\n"));
			//exercise
			var nglist = c.initNG();
			//verify
			expect(nglist.ngid).toEqual(ngid);
			expect(nglist.ngname).toEqual(ngname);
			expect(nglist.ngword).toEqual(ngword);
			expect(nglist.ngres).toEqual(ngres);
		})

		it("ngがGMに登録されていない時、nglistの配列は空の配列になる", function(){
			//exercise
			var nglist = c.initNG();
			//verify
			expect(nglist.ngid).toEqual([]);
			expect(nglist.ngname).toEqual([]);
			expect(nglist.ngword).toEqual([]);
			expect(nglist.ngres).toEqual([]);
		});
	});
	
	describe("insertStyleのテスト", function(){
		it("styleタグが挿入される", function(){
			//exercise
			c.insertStyle();
			//verify
			expect($("style#nicoDicBBSViewerCSS").size()).toEqual(1);
			//tearDown
			$("style#nicoDicBBSViewerCSS").remove();
		});
	});

	describe("UrlAnalyzerのテスト", function(){
		describe("inArticlePageのテスト", function(){
			var sut;
			beforeEach(function(){
				sut = new c.UrlAnalyzer();
			});

			it("記事ページにいるときにtrueを返す", function(){
				//setUp
				spyOn(sut, "getNowUrl").and.returnValue("http://dic.nicovideo.jp/a/%E3%82%A4%E3%83%8A%E3%83%90");
				//exercise
				var actual = sut.inArticlePage();
				//verify
				expect(actual).toEqual(true);
			});

			it("掲示板ページにいるときにfalseを返す", function(){
				//estUp
				spyOn(sut, "getNowUrl").and.returnValue("http://dic.nicovideo.jp/b/a/%E3%82%A4%E3%83%8A%E3%83%90/1-");
				//exercise
				var actual = sut.inArticlePage();
				//verify
				expect(actual).toEqual(false);
			})
		});

		describe("getBBSURLsのテスト", function(){
			var sut;
			beforeEach(function(){
				sut = new c.UrlAnalyzer();
			});

			describe("記事ページで", function(){
				beforeEach(function(){
					spyOn(sut, "inArticlePage").and.returnValue(true);
				});

				it("レス数30以下の時、掲示板ページのurl一つを持つ配列が帰ってくる", function(){
					//serUp
					var basicUrl = "/b/a/%E3%82%A4%E3%83%8A%E3%83%90/";
					var pager = '<div class="pager"><a href="/a/%E3%82%A4%E3%83%8A%E3%83%90" class="navi">-イナバの記事へ戻る-</a>' + 
								'<a href="' + basicUrl + '1-">1-</a></div>';
					spyOn(sut, "getNowUrl").and.returnValue("http://dic.nicovideo.jp/a/%E3%82%A4%E3%83%8A%E3%83%90");
					//exercise
					var actual = sut.getBBSURLs($(pager));
					//verify
					//basicUrl = $("<a>").attr("href", basicUrl).get(0).href;
					expect(actual.length).toEqual(1);
					expect(actual[0]).toEqualAsUrl(basicUrl + "1-");
				});

				it("レス数が30より多い時、掲示板ページをすべて含む配列が帰ってくる", function(){
					//setUP
					var basicUrl = "/b/a/greasemonkey/";
					var pager = '<div class="pager"><a href="/a/greasemonkey" class="navi">-Greasemonkeyの記事へ戻る-</a>' + 
								'<a href="' + basicUrl + '121-" class="navi">&#171; 前へ</a><a href="' + basicUrl + '1-"> 1 </a><span>....</span>' + 
								'<a href="' + basicUrl + '61-">61-</a><a href="' + basicUrl + '91-">91-</a>' + 
								'<a href="' + basicUrl + '121-">121-</a><a href="' + basicUrl + '151-">151-</a></div>';
					spyOn(sut, "getNowUrl").and.returnValue("http://dic.nicovideo.jp/a/greasemonkey");
					//exersise
					var actual = sut.getBBSURLs($(pager));
					//berify
					expect(actual.length).toEqual(6);
					expect(actual[0]).toEqualAsUrl(basicUrl + "1-");
					expect(actual[1]).toEqualAsUrl(basicUrl + "31-");
					expect(actual[2]).toEqualAsUrl(basicUrl + "61-");
					expect(actual[3]).toEqualAsUrl(basicUrl + "91-");
					expect(actual[4]).toEqualAsUrl(basicUrl + "121-");
					expect(actual[5]).toEqualAsUrl(basicUrl + "151-");
				});
			});

			describe("掲示板ページで", function(){
				beforeEach(function(){
					spyOn(sut, "inArticlePage").and.returnValue(false);
				});

				it("レス数30以下で掲示板ページの時、掲示板ページのurl一つを持つ配列が帰ってくる", function(){
					lessThan31Test("http://dic.nicovideo.jp/b/a/%E3%82%A4%E3%83%8A%E3%83%90/1-");
				});

				it("レス数30以下で掲示板ページで、#を含む時、掲示板ページのurl一つを持つ配列が帰ってくる", function(){
					lessThan31Test("http://dic.nicovideo.jp/b/a/%E3%82%A4%E3%83%8A%E3%83%90/1-#1");
				});

				var lessThan31Test = function(nowUrl){
					//setUP
					var basicUrl = "/b/a/%E3%82%A4%E3%83%8A%E3%83%90/";
					var pager = '<div class="pager"><a href="/a/%E3%82%A4%E3%83%8A%E3%83%90" class="navi">-イナバの記事へ戻る-</a>' +
							'<span class="current">1-</span></div>';
					spyOn(sut, "getNowUrl").and.returnValue(nowUrl);
					//exercise
					var actual = sut.getBBSURLs($(pager));
					//verify
					expect(actual.length).toEqual(1);
					expect(actual[0]).toEqualAsUrl("dic.nicovideo.jp" + basicUrl + "1-");
				};

				it("レス数が30より多く、その中ほどのページの時、掲示板ページをすべて含む配列が帰ってくる", function(){
					moreThan30AtNotEndTest("http://dic.nicovideo.jp/b/a/greasemonkey/91-");
				});

				it("レス数が30より多く、その中ほどのページで、#を含む時、掲示板ページをすべて含む配列が帰ってくる", function(){
					moreThan30AtNotEndTest("http://dic.nicovideo.jp/b/a/greasemonkey/91-");
				});

				var moreThan30AtNotEndTest = function(nowUrl){
					//setUp
					var basicUrl = "/b/a/greasemonkey/";
					var pager = '<div class="pager"><a href="/a/greasemonkey" class="navi">-Greasemonkeyの記事へ戻る-</a>' + 
								'<a href="' + basicUrl + '61-" class="navi">&#171; 前へ</a><a href="' + basicUrl + '1-">1-</a><a href="' + basicUrl + '31-">31-</a>' + 
								'<a href="' + basicUrl + '61-">61-</a><span class="current">91-</span><a href="' + basicUrl + '121-">121-</a>' + 
								'<a href="' + basicUrl + '151-">151-</a><a href="' + basicUrl + '121-" class="navi">次へ &#187;</a></div>';
					spyOn(sut, "getNowUrl").and.returnValue(nowUrl);
					//exercise
					var actual = sut.getBBSURLs($(pager));
					//verify
					expect(actual.length).toEqual(6);
					expect(actual[0]).toEqualAsUrl(basicUrl + "1-");
					expect(actual[1]).toEqualAsUrl(basicUrl + "31-");
					expect(actual[2]).toEqualAsUrl(basicUrl + "61-");
					expect(actual[3]).toEqualAsUrl(basicUrl + "91-");
					expect(actual[4]).toEqualAsUrl(basicUrl + "121-");
					expect(actual[5]).toEqualAsUrl(basicUrl + "151-");
				}

				it("レス数が30より多く、最終ページの時、掲示板ページをすべて含む配列が帰ってくる", function(){
					moreThan30AtEndTest("http://dic.nicovideo.jp/b/a/greasemonkey/151-");
				});

				it("レス数が30より多く、最終ページで、#を含むの時、掲示板ページをすべて含む配列が帰ってくる", function(){
					moreThan30AtEndTest("http://dic.nicovideo.jp/b/a/greasemonkey/151-#151");
				});

				var moreThan30AtEndTest = function(nowUrl){
					var basicUrl = "/b/a/greasemonkey/";
					var pager = '<div class="pager"><a href="/a/greasemonkey" class="navi">-Greasemonkeyの記事へ戻る-</a>' +
								'<a href="' + basicUrl + '121-" class="navi">&#171; 前へ</a><a href="' + basicUrl + '1-"> 1 </a><span>....</span>' + 
								'<a href="' + basicUrl + '61-">61-</a><a href="' + basicUrl + '91-">91-</a><a href="' + basicUrl + '121-">121-</a>' +
								'<span class="current">151-</span></div>';
					spyOn(sut, "getNowUrl").and.returnValue(nowUrl);
					//exercise
					var actual = sut.getBBSURLs($(pager));
					//verify
					expect(actual.length).toEqual(6);
					expect(actual[0]).toEqualAsUrl(basicUrl + "1-");
					expect(actual[1]).toEqualAsUrl(basicUrl + "31-");
					expect(actual[2]).toEqualAsUrl(basicUrl + "61-");
					expect(actual[3]).toEqualAsUrl(basicUrl + "91-");
					expect(actual[4]).toEqualAsUrl(basicUrl + "121-");
					expect(actual[5]).toEqualAsUrl(basicUrl + "151-");
				}

			});
		});
	});

	describe("ResListのテスト", function(){
		describe("createResのテスト", function(){
			it("dlを渡すとresponds.resができる", function(){
				//setUp
				var sut = new c.ResList();
				var reshead1 = '<dt class="reshead"><a name="1" class="resnumhead"></a>1 ： <span class="name">ななしのよっしん</span>：2011/02/27(日) 20:44:39 ID: s1ywEd/dRU </dt>';
	  			var resbody1 = '<dd class="resbody"> <a class="auto" href="/a/%E3%83%AC%E3%82%B9">レス</a>' +
	 							'<a class="auto" href="/a/%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6%E8%AA%9E%E3%82%8B%E3%82%B9%E3%83%AC">' +
	  							'について語るスレ</a><br>↑なぜか吹いたｗ </dd>';
	  			var reshead2 = '<dt class="reshead"> <a name="2" class="resnumhead"></a>2 ： <span class="name">ななしのよっしん</span> ：2011/03/16(水) 01:40:04 ID: CGzYMTAdwz </dt>';
	  			var resbody2 = '<dd class="resbody"> 逆から読んでも「<a class="auto" href="/a/%E3%83%AC%E3%82%B9">レス</a>' +
	  							'<a class="auto" href="/a/%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6%E8%AA%9E%E3%82%8B%E3%82%B9%E3%83%AC">について語るスレ</a>」だよ！<br>' +
	  							'<a class="auto" href="/a/%E3%81%99%E3%81%94%E3%81%84">すごい</a>でしょ！ </dd>';
				var html = '<dl>' + reshead1 + resbody1 + reshead2 + resbody2 + '</dl>';
	  			var dl = $(html);
	  			//exercise
	  			sut.createRes(dl);
	  			//verify
	  			var resList = sut.resList;
	  			expect(resList.length).toEqual(2);
	  			expect(resList[0].reshead.html()).toEqual($(reshead1).attr("data-number", "1").attr("data-name", "ななしのよっしん").attr("data-id", "s1ywEd/dRU").html());
	  			expect(resList[0].resbody.html()).toEqual($(resbody1).html());
	  		});
		});
		describe("createResListByIdのテスト", function(){
			it("createResした後にcreateResListByIdすると、idをハッシュに持つResのマップresListByIdが作れる", function(){
				//serUp
				var sut = new c.ResList();
				var reshead1 = '  <dt class="reshead"><a name="12" class="resnumhead"></a>12 ： <span class="name">ななしのよっしん</span>' + 
								' ：2008/05/29(木) 13:04:16 ID: VEXO5K3Cit</dt>';
				var resbody1 = '  <dd class="resbody"><a class="auto" href="/a/TAS">TAS</a>だと、<a class="auto" href="/a/%E7%A2%BA%E7%AB%8B">確立</a>' + 
								'監視ならともかく、操作は出来なくない？</dd>';
				var reshead2 = '<dt class="reshead"><a name="13" class="resnumhead"></a>13 ： <span class="name">ななしのよっしん</span>' + 
								' ：2008/05/29(木) 21:50:49 ID: ZC/SF+vbue</dt>';
				var resbody2 = '  <dd class="resbody"><a href="/b/a/tas/1-#12" rel="nofollow" target="_blank" class="dic">&gt;&gt;12</a>' +
								'<br>出したい結果が出るまで繰り返すってことじゃないか？<br>例）<a class="auto" href="/a/%E3%82%B5%E3%82%A4%E3%82%B3%E3%83%AD">サイコロ</a>の' + 
								'<a class="auto-hdn" href="/a/%E7%9B%AE">目</a>で１が出るまで、振り始める<a class="auto-hdn" href="/a/%E7%9E%AC">瞬</a>間まで戻って振り直す' +
								'<br><br><a class="auto" href="/a/%E7%A2%BA%E7%8E%87">確率</a>操作とは違うか……？</dd>';
				var reshead3 = '  <dt class="reshead"><a name="14" class="resnumhead"></a>14 ： <span class="name">ななしのよっしん</span>' +
								' ：2008/05/29(木) 22:19:35 ID: VEXO5K3Cit</dt>';
				var resbody3 = '  <dd class="resbody"><a href="/b/a/tas/1-#13" rel="nofollow" target="_blank" class="dic">&gt;&gt;13</a>' +
								'<br><a class="auto" href="/a/TAS">TAS</a>の場合、なんどQLしても同じ<a class="auto" href="/a/%E3%83%95%E3%83%AC%E3%83%BC%E3%83%A0">フレーム</a>なら</dd>';  
				var html = "<dl>" + reshead1 + resbody1 + reshead2 + resbody2 + reshead3 + resbody3 + "</dl>";
				sut.createRes($(html));
				//exercise
				sut.createResListById();
				//verify
				var resListById = sut.resListById;
				expect(resListById["CGzYMTAdwz"]).toBeUndefined();
				expect(resListById["ZC/SF+vbue"].length).toEqual(1);
				expect(resListById["ZC/SF+vbue"][0].resbody.html()).toEqual($(resbody2).html());
				expect(resListById["VEXO5K3Cit"].length).toEqual(2);
				expect(resListById["VEXO5K3Cit"][0].resbody.html()).toEqual($(resbody1).html());
				expect(resListById["VEXO5K3Cit"][1].resbody.html()).toEqual($(resbody3).html());
			});
		});
	});

	describe("Resのテスト", function(){

		describe("IDに関する処理のテスト", function(){
							var cloneHeadAndBody = function(copingIndex, copiedIndex){
					reshead[copingIndex] = reshead[copiedIndex];
					resbody[copingIndex] = resbody[copiedIndex]
				}

				var list;
				var reshead;
				var resbody;
				var res1;
				var res2;
				var res3;
				var res4;
				var res5;
				var res6;
			beforeEach(function(){
				list = new c.ResList();
				reshead = [];
				resbody = [];
				reshead[0] = '<dt class="reshead"><a name="571" class="resnumhead"></a>571 ： <span class="name">ななしのよっしん</span>' +
	   						 	'：2014/03/03(月) 15:04:54 ID: qPNYanDe5D</dt>';
	   			resbody[0] = '<dd>1</dd>';
	   			reshead[1] = '<dt class="reshead"><a name="571" class="resnumhead"></a>571 ： <span class="name">ななしのよっしん</span>' +
	   						 	'：2014/03/03(月) 15:04:54 ID: emVU2va0WS</dt>';
	   			resbody[1] = '<dd>3</dd>';
	   			reshead[2] = '<dt class="reshead"><a name="571" class="resnumhead"></a>571 ： <span class="name">ななしのよっしん</span>' +
	   						 	'：2014/03/03(月) 15:04:54 ID: 7vRpsL9G6C</dt>';
	   			resbody[2] = '<dd>5</dd>';
	   			for(var i = 3; i <= 4; i++){
	   				cloneHeadAndBody(i, 1);
	   			}
	   			for(var i = 5; i<=8; i++){
	   				cloneHeadAndBody(i, 2);
	   			}

				reshead[9] = '<dt class="reshead"><a name="571" class="resnumhead"></a>571 ： <span class="name">ななしのよっしん</span>' +
	   						 	'：2014/03/03(月) 15:04:54 ID: qPNYanDe5a</dt>';
	   			resbody[9] = '<dd>1</dd>';
	   			reshead[10] = '<dt class="reshead"><a name="571" class="resnumhead"></a>571 ： <span class="name">ななしのよっしん</span>' +
	   						 	'：2014/03/03(月) 15:04:54 ID: emVU2va0Wt</dt>';
	   			resbody[10] = '<dd>3</dd>';
	   			reshead[11] = '<dt class="reshead"><a name="571" class="resnumhead"></a>571 ： <span class="name">ななしのよっしん</span>' +
	   						 	'：2014/03/03(月) 15:04:54 ID: 7vRpsL9G6r</dt>';
	   			resbody[11] = '<dd>5</dd>';
	   			cloneHeadAndBody(12, 11);

	   			var html = constructDl(reshead, resbody);
	   			list.createRes($(html));
	   			list.createResListById();

	   			res1 = list.resList[0];
	   			res2 = list.resList[1];
	   			res3 = list.resList[7];
	   			res4 = list.resList[9];
	   			res5 = list.resList[10];
	   			res6 = list.resList[12];
			});

			describe("makeIDDivRefrectingSameIDのテスト", function(){

				it("classificationIDフラグが立っている時、createRes,createResListByIdの後にmakeIDDivRefrectingSameIDをすると、同一IDの数と何番目か、また色分けがされる", function(){
					//serUp
		   			GM_setValue("classificationID", true);
		  			//exercise
		  			res1.makeIDDivReflectingSameID(list.resListById);
		  			res2.makeIDDivReflectingSameID(list.resListById);
		  			res3.makeIDDivReflectingSameID(list.resListById);
		  			//verify
		  			expect(res1.reshead.html()).not.toMatch(/\[/);
		  			expect(res2.reshead.html()).toMatch(/\[1\/3\]/);
		  			expect(res3.reshead.html()).toMatch(/\[4\/5\]/);
		  			expect(res1.reshead.find("div").hasClass("ID")).toEqual(true);
		  			expect(res2.reshead.find("div").hasClass("IDMulti")).toEqual(true);
		  			expect(res3.reshead.find("div").hasClass("IDMany")).toEqual(true);
				});

				it("classificationIDフラグが立っている時、createRes,createResListByIdの後にmakeIDDivRefrectingSameIDをすると、IDの数は付加されず、class:IDが付加される", function(){
					//exercise
		  			res1.makeIDDivReflectingSameID(list.resListById);
		  			res2.makeIDDivReflectingSameID(list.resListById);
		  			res3.makeIDDivReflectingSameID(list.resListById);
		  			//verify
		  			expect(res1.reshead.html()).not.toMatch(/\[/);
		  			expect(res2.reshead.html()).not.toMatch(/\[/);
		  			expect(res3.reshead.html()).not.toMatch(/\[/);
		  			expect(res1.reshead.find("div").hasClass("ID")).toEqual(true);
		  			expect(res2.reshead.find("div").hasClass("ID")).toEqual(true);
		  			expect(res3.reshead.find("div").hasClass("ID")).toEqual(true);		
		  		});

		  		it("makeIDDivRefrectingSameIDをした後、再度makeIDDivRefrectingSameIDをすると、IDの数とclassが付け替えられる", function(){
		  			//setUp
		  			GM_setValue("classificationID", true);
		  			res1.makeIDDivReflectingSameID(list.resListById);
		  			res2.makeIDDivReflectingSameID(list.resListById);
		  			res3.makeIDDivReflectingSameID(list.resListById);
		   			res4.makeIDDivReflectingSameID(list.resListById);
		  			res5.makeIDDivReflectingSameID(list.resListById);
		  			res6.makeIDDivReflectingSameID(list.resListById);
		  			cloneHeadAndBody(13, 9);
		  			for(var i = 14; i <= 17; i++){
		  				cloneHeadAndBody(i, 10);
		  			}
		  			for(var i = 18; i <= 22; i++){
		  				cloneHeadAndBody(i, 11);
		  			}
		  			var html = "<dl>";
		  			for(var i = 0; i < reshead.length; i++){
		  				html = html + reshead[i] + resbody[i];
		  			}
		  			html = html + "</dl>";
		   			list.createRes($(html));
		   			list.createResListById();
		    		res1 = list.resList[0];
		   			res2 = list.resList[1];
		   			res3 = list.resList[7];
		   			res4 = list.resList[9];
		   			res5 = list.resList[10];
		   			res6 = list.resList[12];
		  			//exercise
		  			res1.makeIDDivReflectingSameID(list.resListById);
		  			res2.makeIDDivReflectingSameID(list.resListById);
		  			res3.makeIDDivReflectingSameID(list.resListById);
		   			res4.makeIDDivReflectingSameID(list.resListById);
		  			res5.makeIDDivReflectingSameID(list.resListById);
		  			res6.makeIDDivReflectingSameID(list.resListById);
		  			//verify
		  			expect(res1.reshead.html()).not.toMatch(/\[/);
		  			expect(res2.reshead.html()).toMatch(/\[1\/3\]/);
		  			expect(res3.reshead.html()).toMatch(/\[4\/5\]/);
		  			expect(res4.reshead.html()).toMatch(/\[1\/2\]/);
		  			expect(res5.reshead.html()).toMatch(/\[1\/5\]/);
		  			expect(res6.reshead.html()).toMatch(/\[2\/7\]/);
		  			expect(res1.reshead.find("div").hasClass("ID")).toEqual(true);
		  			expect(res2.reshead.find("div").hasClass("IDMulti")).toEqual(true);
		  			expect(res3.reshead.find("div").hasClass("IDMany")).toEqual(true);
		  			expect(res4.reshead.find("div").hasClass("IDMulti")).toEqual(true);
		  			expect(res5.reshead.find("div").hasClass("IDMany")).toEqual(true);
		  			expect(res6.reshead.find("div").hasClass("IDMany")).toEqual(true);
		  		});
			});

			describe("makeIDTooltipのテスト", function(){
				beforeEach(function(){
					//setUp
					GM_setValue("classificationID", true);
					res2.makeIDDivReflectingSameID(list.resListById);
				});

				it("createResList、createResListById、の後にmakeIDTooltipをすると、mouseenterイベントでツールチップが出る", function(){
					//exercise
					res2.makeIDTooltip(list.resListById);
					res2.reshead.find("div[class^='ID']").trigger("mouseenter");
					//verify
					expect(res2.reshead.find("div[class^='ID'] > div").size()).toEqual(1);
					expect(res2.reshead.find("div[class^='ID'] > div .reshead").size()).toEqual(3);
				});
			});
		});



		describe("makeNumberDivのテスト", function(){
			var reshead;
			var resbody;
			var list;
			var res;

			beforeEach(function(){
				reshead = [];
				resbody = [];
				res = [];
				reshead[0] = '<dt class="reshead"><a name="1" class="resnumhead"></a>1 ： <span class="name">ななしのよっしん</span> ：2009/01/11(日) 23:44:16 ID: b6fD7NC5x/</dt>';
				resbody[0] = '<dd class="resbody"><a href="/b/a/name/1-#2" rel="nofollow" target="_blank" class="dic">&gt;&gt;2-3</a></dd>';
				reshead[1] = '<dt class="reshead"><a name="2" class="resnumhead"></a>2 ： <span class="name">ななしのよっしん</span> ：2009/01/11(日) 23:44:16 ID: b6fD7NC5x/</dt>';
				resbody[1] = '<dd class="resbody"><a href="/b/a/name/1-#3" rel="nofollow" target="_blank" class="dic">&gt;&gt;3</a></dd>';
				reshead[2] = '<dt class="reshead"><a name="3" class="resnumhead"></a>3 ： <span class="name">ななしのよっしん</span> ：2009/01/11(日) 23:44:16 ID: b6fD7NC5x/</dt>';
				resbody[2] = '<dd class="resbody"><a href="/b/a/name/1-#3" rel="nofollow" target="_blank" class="dic">&gt;&gt;3</a>' + 
								'<a href="/b/a/name/1-#2" rel="nofollow" target="_blank" class="dic">&gt;&gt;2</a>' + 
								'<a href="/b/a/name/1-#2" rel="nofollow" target="_blank" class="dic">&gt;&gt;2</a></dd>';
				reshead[3] = '<dt class="reshead"><a name="4" class="resnumhead"></a>4 ： <span class="name">ななしのよっしん</span> ：2009/01/11(日) 23:44:16 ID: b6fD7NC5x/</dt>';
				resbody[3] = '<dd class="resbody"><a href="/b/a/name/1-#2" rel="nofollow" target="_blank" class="dic">&gt;&gt;2-4</a></dd>';
		 		var html = constructDl(reshead, resbody);
		 		list = new c.ResList();
		 		list.createRes($(html));
		 		res[0] = list.resList[0];
		 		res[1] = list.resList[1];
		 		res[2] = list.resList[2];
		 		res[3] = list.resList[3];
			})

			it("classificationResNumberフラグが立っている時、createIDの後makeNumberDivをすると、リンクされているレスの番号に下線、及び色分けがされる", function(){
				//setUp
		 		GM_setValue("classificationResNumber", true);
		 		//exsecise
		 		res[0].makeNumberDiv(list.resList);
		 		res[1].makeNumberDiv(list.resList);
		 		res[2].makeNumberDiv(list.resList);
		 		res[3].makeNumberDiv(list.resList);
		 		//verify
		 		expect(res[0].reshead.find("div").size()).toEqual(0);
		 		expect(res[1].reshead.find("div").hasClass("NumberMulti")).toEqual(true);
		 		expect(res[2].reshead.find("div").hasClass("NumberMany")).toEqual(true);
		 		expect(res[3].reshead.find("div").hasClass("Number")).toEqual(true);

			});

			it("classificationResNumberフラグが立っている時、createIDの後makeNumberDivをすると、リンクされているレスの番号に下線はひかれるが、色分けはされない", function(){
				//setUp
		 		//exsecise
		 		res[0].makeNumberDiv(list.resList);
		 		res[1].makeNumberDiv(list.resList);
		 		res[2].makeNumberDiv(list.resList);
		 		res[3].makeNumberDiv(list.resList);
		 		//verify
		 		expect(res[0].reshead.find("div").size()).toEqual(0);
		 		expect(res[1].reshead.find("div").hasClass("Number")).toEqual(true);
		 		expect(res[2].reshead.find("div").hasClass("Number")).toEqual(true);
		 		expect(res[3].reshead.find("div").hasClass("Number")).toEqual(true);

			});

			it("makeNumberDivをしなおしても、下線、色分けはなされる", function(){
				//setUp
				GM_setValue("classificationResNumber", true);
				reshead[4] = '<dt class="reshead"><a name="5" class="resnumhead"></a>5 ： <span class="name">ななしのよっしん</span> ：2009/01/11(日) 23:44:16 ID: b6fD7NC5x/</dt>';
				resbody[4] = '<dd class="resbody"><a href="/b/a/name/1-#2" rel="nofollow" target="_blank" class="dic">&gt;&gt;7</a></dd>';
				reshead[5] = '<dt class="reshead"><a name="6" class="resnumhead"></a>6 ： <span class="name">ななしのよっしん</span> ：2009/01/11(日) 23:44:16 ID: b6fD7NC5x/</dt>';
				resbody[5] = '<dd class="resbody"><a href="/b/a/name/1-#2" rel="nofollow" target="_blank" class="dic">&gt;&gt;2</a></dd>';
				var html = constructDl(reshead, resbody);
				list = new c.ResList();
		 		list.createRes($(html));
		 		//exercise
		 		res[0].makeNumberDiv(list.resList);
		 		res[1].makeNumberDiv(list.resList);
		 		res[2].makeNumberDiv(list.resList);
		 		res[3].makeNumberDiv(list.resList);
		 		//verify
		 		expect(res[0].reshead.find("div").size()).toEqual(0);
		 		expect(res[1].reshead.find("div").hasClass("NumberMany")).toEqual(true);
		 		expect(res[2].reshead.find("div").hasClass("NumberMany")).toEqual(true);
		 		expect(res[3].reshead.find("div").hasClass("Number")).toEqual(true);
			});
		});
	});
});
