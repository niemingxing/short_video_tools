	let keywords = '';
	let keywordList = [];
	let currentDomain = window.location.hostname;
	let currentKeywords = "",currentKeywordsAliasTitle = '';
	let noCompleteKeywords = [];
	let statusMap = {0:"未处理",1:"已采集",2:"已发布",3:"生成中",4:"排队中",5:"采集完"};
	let statusColorClassMap = {0:'unresolved',1:'generated',2:'published',3:'generating',4:'queuing',5:'collect_completed'};

	/**
	 * 利用ChatGpt根据关键词创建文章
	 * @param data
	 */
	function initDownladVideo(data)
	{
		window.focus();
		keywords = data.keywords;
		keywordList = keywords.split("\n").filter(function(value, index, self) {
			// 过滤掉空字符串和重复元素
			return value.trim() !== "" && self.indexOf(value) === index;
		});
		chrome.storage.local.get('nmx_video_pga_keywords_dolist', function(result) {
			let doList = result.nmx_video_pga_keywords_dolist ? result.nmx_video_pga_keywords_dolist : {};
			for (var i = 0; i < keywordList.length; i++) {
				//status:0-未处理，1-已完成，2-已发布
				if (!doList.hasOwnProperty(keywordList[i])) {
					doList[keywordList[i]] = {'keywords':keywordList[i],'alias_title':'','status':0,'content':'','timestamp':new Date().getTime()}
					addKeywordListItemElement({'title':keywordList[i],'alias_title':'','status_text':statusMap[0],'status':0},2);
				}
			}
			chrome.storage.local.set({ 'nmx_video_pga_keywords_dolist': doList }, function() {
				console.log('关键词组存储成功！');
				initCreateStatus();
			});
		});
	}


	function sendWebSpiderRequest(url)
	{
		chrome.runtime.sendMessage({ 'type': 'web_spider_collect',"url":url });
	}

	/**
	 * 初始化关键词文章创建状态
	 */
	function initCreateStatus()
	{
		let keywordsContent = {};
		for (var i = 0; i < keywordList.length; i++) {
			let keywords = keywordList[i];
			noCompleteKeywords.push(keywords);
			updateKeywordsListItemElement(keywords,{'title':keywords,'status_text':statusMap[4],'status':4});
		}
		chrome.storage.local.get('nmx_video_pga_keywords_dolist', function(result) {
			let doList = result.nmx_video_pga_keywords_dolist;
			for (var i = 0; i < noCompleteKeywords.length; i++) {
				if(!doList.hasOwnProperty(noCompleteKeywords[i]))
				{
					doList[noCompleteKeywords[i]]['status'] = 4;
					doList[noCompleteKeywords[i]]['content'] = keywordsContent[noCompleteKeywords[i]];
					doList[noCompleteKeywords[i]]['timestamp'] = new Date().getTime();
					addKeywordListItemElement({'title':noCompleteKeywords[i],'status_text':statusMap[4],'status':4});
				}
			}
			chrome.storage.local.set({ 'nmx_video_pga_keywords_dolist': doList }, function() {
				console.log("初始化关键词完成状态！");
				document.querySelector("#gpt-sr-toggleButton").click();
			});
		});
	}

	chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
		console.log(message);
		if(message.type == 'collect_video')
		{
			initDownladVideo(message);
		}
		else if(message.type == 'pga_keywords_publish')
		{
			updateKeywordsListItemElement(message.data['keywords'],{'title':message.data['keywords'],'status':message.data['status'],'status_text':statusMap[message.data['status']]});
		}
		else if(message.type == 'web_spider_complete')
		{
			chrome.storage.local.get('nmx_video_pga_keywords_dolist', function(result) {
				let doList = result.nmx_video_pga_keywords_dolist;
				doList[currentKeywords]['alias_title'] = message.data.title;
				chrome.storage.local.set({ 'nmx_video_pga_keywords_dolist': doList }, function() {
					updateKeywordsListItemElement(currentKeywords,{'title':currentKeywords,'alias_title':message.data.title,'status':5,'status_text':statusMap[5]});
					if(noCompleteKeywords.length > 0)
					{
						currentKeywords = noCompleteKeywords.shift();
						sendWebSpiderRequest(currentKeywords);
					}
				});
			});
		}
		else if(message.type == 'direct_download')
		{
			const videoElements = document.querySelectorAll("xg-video-container.xg-video-container video");
			const videoDetailElements = document.querySelectorAll("div[data-e2e-aweme-id]");
			if(videoElements.length >0)
			{
				console.log(videoElements.length);
				let midIndex = Math.floor(videoElements.length/2);
				let sourceElements = videoElements[midIndex].querySelectorAll("source");
				let midDetailIndex = Math.floor(videoDetailElements.length/2);
				let videoId = videoDetailElements[midDetailIndex].getAttribute('data-e2e-aweme-id');
				let sourceList = [];
				console.log("采集成功",sourceList);
				if(sourceElements.length>0)
				{
					sourceElements.forEach((node) => {
						// 操作每个节点的代码
						sourceList.push(node.getAttribute("src"));
					});
					let videoUrl = sourceList[1];
					let videoFilename = videoId + ".mp4";
					console.log(videoUrl);
					downloadVideo(videoUrl, videoFilename);
				}
				else if(videoDetailElements.length >0)
				{
					sendWebSpiderRequest("https://www.douyin.com/video/"+videoId);
				}
			}
		}
	});

	function downloadVideo(url, filename) {
		fetch(url)
			.then(response => response.blob())
			.then(blob => {
				const link = document.createElement("a");
				link.href = URL.createObjectURL(blob);
				link.download = filename;
				link.click();
				URL.revokeObjectURL(link.href);
			}).catch(error => {
				showPromptMessagePopup("视频下载异常，请重新点击下载！");
				console.log("Error downloading the video:", error);
		});
	}

	/**
	 * 初始化提示窗
	 */
	function initPromptMessagePopup()
	{
		let html = "<div id=\"nmx_video_popup\" class=\"custom-popup\">\n" +
			"\t\t<div class=\"custom-popup-overlay\"></div>\n" +
			"\t\t<div class=\"custom-popup-content\">\n" +
			"\t\t\t<span id=\"nmx_video_popup_message\" class=\"custom-popup-question\"></span>\n" +
			"\t\t\t<button id=\"nmx_video_close_popupbtn\" class=\"custom-popup-close-btn\">确认</button>\n" +
			"\t\t</div>\n" +
			"\t</div>";
		const popupElement = document.createElement("div");
		popupElement.innerHTML = html;
		document.body.appendChild(popupElement);
		// 获取弹窗元素
		const popup = document.getElementById('nmx_video_popup');
		// 获取关闭按钮元素
		const closeButton = document.getElementById('nmx_video_close_popupbtn');

		// 点击关闭按钮关闭弹窗
		closeButton.addEventListener('click', function (){
			popup.style.display = 'none';
		});
	}

	// 显示弹窗并设置错误提示文字
	function showPromptMessagePopup(message) {
		// 获取弹窗元素
		const popup = document.getElementById('nmx_video_popup');
		// 获取错误提示元素
		const errorText = document.getElementById('nmx_video_popup_message');
		errorText.textContent = message;
		popup.style.display = 'block';
	}

	/**
	 * 初始化弹层
	 */
	function initVideoListPopup() {
		const keywrodsHtmlLayer = '<div class="gpt-sr-container">\n' +
			'    <div class="gpt-sr-sidebar">\n' +
			'      <button id="gpt-sr-toggleButton">视频列表</button>\n' +
			'    </div>\n' +
			'  </div>\n' +
			'  \n' +
			'  <div id="gpt-sr-popup" class="gpt-sr-popup">\n' +
			'    <button class="gpt-sr-close-btn">&times;</button>\n' +
			'	 <button class="gpt-sr-starting-btn">开始执行</button>\n' +
			'    <div class="gpt-sr-content">\n' +
			'      <h2 class="gpt-sr-title">关键词列表</h2>\n' +
			'      <ul class="gpt-sr-list">\n' +
			'      </ul>\n' +
			'    </div>\n' +
			'  </div>';
		const popupElement = document.createElement("div");
		popupElement.innerHTML = keywrodsHtmlLayer;
		document.body.appendChild(popupElement);
		document.querySelector("#gpt-sr-toggleButton").addEventListener("click", function() {
			var popup = document.getElementById("gpt-sr-popup");
			popup.classList.toggle("gpt-sr-active");
		});

		document.querySelector("button.gpt-sr-close-btn").addEventListener("click", function() {
			var popup = document.getElementById("gpt-sr-popup");
			popup.classList.remove("gpt-sr-active");
		});

		document.querySelector("button.gpt-sr-starting-btn").addEventListener("click", function() {
			if(noCompleteKeywords.length == 0)
			{
				showPromptMessagePopup("没有待处理的关键词");
			}
			else
			{
				let currentElement = event.target;
				currentElement.disabled = true;
				currentKeywords = noCompleteKeywords.shift();
				sendWebSpiderRequest(currentKeywords);
			}
		});

		document.addEventListener('click', function(event) {
			var toggleButton = document.getElementById('gpt-sr-toggleButton');
			var popup = document.getElementById('gpt-sr-popup');

			// 判断点击的目标元素是否在弹层内部
			var isInsidePopup = popup.contains(event.target);

			// 判断点击的目标元素是否是弹层按钮
			var isToggleButton = (event.target === toggleButton);

			// 如果点击的目标元素不在弹层内部且不是弹层按钮，则隐藏弹层
			if (!isInsidePopup && !isToggleButton) {
				popup.classList.remove("gpt-sr-active");
			}
		});

		chrome.storage.local.get('nmx_video_pga_keywords_dolist', function(result) {
			let doList = result.nmx_video_pga_keywords_dolist;
			console.log(doList);
			let sortedKeys = Object.keys(doList).sort(function(a, b) {
				let timestampA = doList[a].timestamp;
				let timestampB = doList[b].timestamp;
				return timestampB - timestampA;
			});

			sortedKeys.forEach(function(key) {
				if (doList.hasOwnProperty(key)) {
					let data = {
						'title' : key,
						'alias_title':doList[key]['alias_title'],
						'status_text' : statusMap[doList[key]['status']],
						'status':doList[key]['status']
					};
					addKeywordListItemElement(data);
				}
			});
		});
	}

	/**
	 * 创建关键词列表对象
	 * @param data
	 * @returns {HTMLLIElement}
	 */
	function addKeywordListItemElement(data,type = 1)
	{
		let titleHtml = data.title;
		if(checkIsUrl(data.title))
		{
			titleHtml = "<a href='" + data.title + "' target='_blank'>" + data.title + "</a>";
			if(data.hasOwnProperty("alias_title") && data['alias_title'] != "")
			{
				titleHtml = "<a href='" + data.title + "' target='_blank'>" + data['alias_title'] + "</a>";
			}
		}
		let itemHtml = '<span class="gpt-sr-keyword" title="' + data.title + '">' + titleHtml + '</span>\n' +
			'<span class="gpt-sr-status ' + statusColorClassMap[data.status] + '">' + data.status_text + '</span>\n' +
			'<div class="gpt-sr-actions"><button class="gpt-sr-add" title="加入生成">+</button><button class="gpt-sr-delete" title="删除记录">-</button></div>';
		const itemElement = document.createElement("li");
		itemElement.classList.add("gpt-sr-list-item");
		itemElement.setAttribute("data-key", data.title);
		itemElement.innerHTML = itemHtml;
		itemElement.querySelector("div.gpt-sr-actions button.gpt-sr-delete").addEventListener("click", function() {
			var currentElement = event.target;
			currentElement.disabled = true;
			var liParentElement = currentElement.parentNode.parentNode;
			let liKeywords = liParentElement.getAttribute("data-key");
			chrome.storage.local.get('nmx_video_pga_keywords_dolist', function(result) {
				let doList = result.nmx_video_pga_keywords_dolist;
				delete doList[liKeywords];
				chrome.storage.local.set({ 'nmx_video_pga_keywords_dolist': doList }, function() {
					liParentElement.remove();
					updateKewordsListStatistics();
				});
			});
		});
		const addButton = itemElement.querySelector("div.gpt-sr-actions button.gpt-sr-add");
		addButton.addEventListener("click",function(){
			var currentElement = event.target;
			currentElement.disabled = true;
			var liParentElement = currentElement.parentNode.parentNode;
			let liKeywords = liParentElement.getAttribute("data-key");
			noCompleteKeywords.push(liKeywords);
			updateKeywordsListItemElement(liKeywords,{'title':liKeywords,'status_text':statusMap[4],'status':4});
		});

		if(data.status == 0)
		{
			addButton.disabled = false;
		}
		else
		{
			addButton.disabled = true;
		}

		let listPanel = document.querySelector("#gpt-sr-popup ul");
		if(type == 1)
		{
			listPanel.appendChild(itemElement);
		}
		else if(type == 2)
		{
			listPanel.insertBefore(itemElement, listPanel.firstChild);
		}
		updateKewordsListStatistics();
	}

	/**
	 * 更新关键词列表元素
	 * @param key
	 * @param data
	 */
	function updateKeywordsListItemElement(key,data)
	{
		let itemElement = document.querySelector("#gpt-sr-popup ul li[data-key='" + key + "']");
		if(itemElement)
		{
			let statusElement = itemElement.querySelector("span.gpt-sr-status");
			statusElement.textContent = data.status_text;

			for (let scl in statusColorClassMap) {
				statusElement.classList.remove(statusColorClassMap[scl]);
			}

			statusElement.classList.add(statusColorClassMap[data.status]);

			let titleElement = itemElement.querySelector("span.gpt-sr-keyword");

			if(checkIsUrl(key) && data.hasOwnProperty("alias_title") && data['alias_title'] != "")
			{
				titleElement.querySelector('a').textContent = data.alias_title;
			}


			let addButton = itemElement.querySelector("div.gpt-sr-actions button.gpt-sr-add");
			if(data.status == 0)
			{
				addButton.setAttribute("disabled", false);
			}
			else
			{
				addButton.setAttribute("disabled", true);
			}
		}
		else
		{
			addKeywordListItemElement(data);
		}
		updateKewordsListStatistics();
	}

	function updateKewordsListStatistics()
	{
		let kwItems = document.querySelectorAll("#gpt-sr-popup ul li");
		document.querySelector("#gpt-sr-popup div.gpt-sr-content h2").textContent = "关键词列表(" + kwItems.length + ")";
	}

	function checkIsUrl(str)
	{
		return str.includes("http://") || str.includes("https://");
	}

	// 引入CSS文件
	function addStylesheet(url) {
		const linkElement = document.createElement("link");
		linkElement.rel = "stylesheet";
		linkElement.type = "text/css";
		linkElement.href = chrome.runtime.getURL(url);
		document.head.appendChild(linkElement);
	}
	// 在页面加载完成后插入弹层和引入CSS文件
	window.onload = function() {
		if(currentDomain.includes("www.douyin.com"))
		{
			//initVideoListPopup();
			initPromptMessagePopup();
			addStylesheet("css/page_layer.css");
		}
	};


