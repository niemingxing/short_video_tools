let currentDomain = window.location.hostname;
let currentUrl = window.location.href;

/**
 * 发送url请求
 * @param url
 */
function sendWebSpiderRequest(url)
{
	chrome.runtime.sendMessage({ 'type': 'web_spider_collect',"url":url });
}

/**
 * 下载视频
 * @param url
 * @param filename
 */
function downloadVideo(url, filename) {
	fetch(url)
		.then(response => response.blob())
		.then(blob => {
			const link = document.createElement("a");
			link.href = URL.createObjectURL(blob);
			link.download = filename;
			link.click();
			URL.revokeObjectURL(link.href);
			closeLoadingProgressBar();
		}).catch(error => {
			closeLoadingProgressBar();
			showPromptMessagePopup("视频下载异常，请重新点击下载！");
			console.log("Error downloading the video:", error);
	});
}

function downloadStreamVideo(url, fileName) {
	console.log("stream download!");
	showLoadingProgressBar();
	fetch(url)
		.then(response => {
			const fileStream = response.body;
			const reader = fileStream.getReader();

			return new ReadableStream({
				start(controller) {
					function read() {
						reader.read().then(({ done, value }) => {
							if (done) {
								controller.close();
								return;
							}
							controller.enqueue(value);
							read();
						});
					}
					read();
				}
			});
		})
		.then(stream => new Response(stream))
		.then(response => response.blob())
		.then(blob => {
			// 创建下载链接并触发下载
			const link = document.createElement("a");
			link.href = URL.createObjectURL(blob);
			link.download = fileName;
			link.click();
			URL.revokeObjectURL(link.href);
			closeLoadingProgressBar();
		})
		.catch(error => {
			closeLoadingProgressBar();
			showPromptMessagePopup("视频下载异常，请重新点击下载！");
			console.error("Error downloading the file:", error);
		});
}

/**
 * 保存内容为csv文件
 * @param csvContent
 */
function downloadCsv(csvContent)
{
	// 创建一个 Blob 对象，将内容保存为 CSV 文件
	var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

	// 生成一个临时下载链接并下载文件
	var link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = "data(" + currentDomain+ ").csv";
	link.click();
}

/**
 * 初始化弹层
 */
function initDownloadButton() {
	const html = '<div class="gpt-sr-container">\n' +
		'    <div class="gpt-sr-sidebar">\n' +
		'      <button id="gpt-sr-toggleButton">视频下载</button>\n' +
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
	popupElement.innerHTML = html;
	document.body.appendChild(popupElement);
	document.querySelector("#gpt-sr-toggleButton").addEventListener("click", function() {
		this.disabled = true;
		chrome.runtime.sendMessage({"type":"check_mkey"}, function (response) {
			console.log(response.farewell)
		});
	});
}

function activiteDownloadButton()
{
	document.querySelector("#gpt-sr-toggleButton").disabled = false;
}

function initOtherActon()
{
	let pageType = getPageType();
	if(pageType == "douyin_search" || pageType == "douyin_user" || pageType == "douyin_search_user")
	{
		setInterval(function (){
			updateDownloadButtonVideoCount();
		},3000);
	}
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

function showLoadingProgressBar()
{
	let loadingProgressBar = document.querySelector("div.custom-loading-progress-bar");
	if(!loadingProgressBar)
	{
		let html = "<div class=\"custom-progress\"></div>";
		loadingProgressBar = document.createElement("div");
		loadingProgressBar.classList.add("custom-loading-progress-bar");
		loadingProgressBar.innerHTML = html;
		document.body.appendChild(loadingProgressBar);
	}
	loadingProgressBar.style.display = 'block';
}

function closeLoadingProgressBar()
{
	let loadingProgressBar = document.querySelector("div.custom-loading-progress-bar");
	if(loadingProgressBar)
	{
		loadingProgressBar.style.display = 'none';
	}
}

// 显示弹窗并设置错误提示文字
function showPromptMessagePopup(message,type =1) {
	// 获取弹窗元素
	const popup = document.getElementById('nmx_video_popup');
	// 获取错误提示元素
	const errorText = document.getElementById('nmx_video_popup_message');
	errorText.textContent = message;
	popup.style.display = 'block';
	if(type == 2)
	{
		// 获取关闭按钮元素
		const closeButton = document.getElementById('nmx_video_close_popupbtn');
		closeButton.style.display = 'none';
		setTimeout(function (){
			closeButton.click();
		},3000);
	}
}

/**
 * 引入css文件
 * @param url
 */
function addStylesheet(url) {
	const linkElement = document.createElement("link");
	linkElement.rel = "stylesheet";
	linkElement.type = "text/css";
	linkElement.href = chrome.runtime.getURL(url);
	document.head.appendChild(linkElement);
}

/**
 * 开始下载
 */
function startDownload()
{
	let pageType = getPageType();
	if(pageType == "douyin_search" || pageType == "douyin_user" || pageType == "douyin_search_user")
	{
		startVideoListDataDownload();
	}
	else
	{
		startVideoDownload();
	}
}

/**
 * 视频数据下载
 */
function startVideoListDataDownload()
{
	let videoListData = getSearchVideoData();
	let header = [];
	let keys = []
	let pageType = getPageType();
	if(pageType == "douyin_search_user")
	{
		header = ["名称","抖音ID","点赞文本","点赞数","粉丝文本","粉丝数","简介","疑似微信号","主页地址"];
		keys = ["name","dyid","like_text","like_nums","fans_text","fans_nums","intro","wx_ids","user_url"];
	}
	let csvContent = convertToCSVContent(videoListData,header,keys);
	downloadCsv(csvContent);
}

/**
 * 开始下载视频
 */
function startVideoDownload()
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
		if(sourceElements.length>0)
		{
			console.log("开始采集",sourceList);
			sourceElements.forEach((node) => {
				// 操作每个节点的代码
				sourceList.push(node.getAttribute("src"));
			});
			let videoUrl = sourceList[1];
			let videoFilename = videoId + ".mp4";
			console.log(videoUrl);
			downloadStreamVideo(videoUrl, videoFilename);
		}
		else if(videoDetailElements.length >0)
		{
			let videoUrl = "https://www.douyin.com/video/"+videoId;
			console.log("开始采集",videoUrl);
			showLoadingProgressBar();
			sendWebSpiderRequest(videoUrl);
		}
	}
}

/**
 * 获取页面类型
 * @returns {string}
 */
function getPageType()
{
	currentUrl = window.location.href;
	let pageType;
	if(currentUrl.includes("https://www.douyin.com/search/") && currentUrl.includes("type=user"))
	{
		pageType = "douyin_search_user";
	}
	else if(currentUrl.includes("https://www.douyin.com/search/"))
	{
		pageType = "douyin_search";
	}
	else if(currentUrl.includes("https://www.douyin.com/discover"))
	{
		pageType = "douyin_home";
	}
	else if(currentUrl.includes("https://www.douyin.com/video/"))
	{
		pageType = "douyin_video";
	}
	else if(currentUrl.includes("https://www.douyin.com/user/"))
	{
		pageType = "douyin_user";
	}
	console.log(pageType);
	return pageType;
}

/**
 * 更新按钮统计文案
 */
function updateDownloadButtonVideoCount()
{
	let buttonElement = document.querySelector("#gpt-sr-toggleButton");
	let videoNums = getSearchVideoCount();
	buttonElement.textContent = "数据下载(" + videoNums + ")";
}

/**
 * 获取搜索页视频数量
 * @returns {number}
 */
function getSearchVideoCount()
{
	let pageType = getPageType();
	let items;
	if(pageType == "douyin_search")
	{
		items = document.querySelectorAll("div[data-home-video-id]");
		return items.length;
	}
	else if(pageType == "douyin_user")
	{
		items = document.querySelectorAll("div[data-e2e=user-post-list] ul li");
		return items.length;
	}
	else if(pageType == "douyin_search_user");
	{
		let aItems = document.querySelectorAll("ul li div.avatar-component-avatar-container");
		let bItems = document.querySelectorAll("ul li span[data-e2e=user-info-living]");
		return aItems.length + bItems.length;
	}
	return 0;
}

/**
 * 获取搜索页视频数据
 * @returns {*[]}
 */
function getSearchVideoData()
{
	let pageType;
	let items;
	let downloadData = [];
	pageType = getPageType();
	if(pageType == "douyin_search") {
		items = document.querySelectorAll("div[data-home-video-id]");
		items.forEach((node) => {
			// 操作每个节点的代码

			let nItem = node.nextElementSibling;
			let dItem = nItem.querySelectorAll("div");
			let title = dItem[1].innerText;
			console.log(title);
			let cItem = dItem[2].querySelectorAll("span");
			let auther = cItem[0].innerText;
			let dateStr = cItem[3].innerText;
			let linkItem = node.parentNode.parentNode;
			let tags = node.querySelectorAll("span");
			let likeText = tags.length > 0 ? tags[tags.length - 1].innerText : "0";
			let likeNums = convertToNumber(likeText);
			let videoUrl = linkItem.href;
			let dataItem = {
				"auther": auther,
				"title": title,
				"like_text": likeText,
				"like_nums": likeNums,
				"video_url": videoUrl,
				"date_str": dateStr
			};
			downloadData.push(dataItem);

		});
	}
	else if(pageType == "douyin_user")
	{
		items = document.querySelectorAll("div[data-e2e=user-post-list] ul li");
		items.forEach((node) => {
			// 操作每个节点的代码
			let tItem = node.querySelector("p");
			let title = tItem.innerText;
			console.log(title);
			let auther = "--";
			let dateStr = "--";
			let linkItem = node.querySelector("a");
			let likeText = node.querySelector("span.author-card-user-video-like").innerText;
			let likeNums = convertToNumber(likeText);
			let videoUrl = linkItem.href;
			let dataItem = {
				"auther": auther,
				"title": title,
				"like_text": likeText,
				"like_nums": likeNums,
				"video_url": videoUrl,
				"date_str": dateStr
			};
			console.log(dataItem);
			downloadData.push(dataItem);
		});
	}
	else if(pageType == "douyin_search_user");
	{
		let aItems = document.querySelectorAll("ul li div.avatar-component-avatar-container");
		let bItems = document.querySelectorAll("ul li span[data-e2e=user-info-living]");
		aItems.forEach((node) => {
			// 操作每个节点的代码
			let nItem = node.nextElementSibling;
			let name = nItem.innerText;
			let bInfo = node.parentElement.nextElementSibling;
			let spans = bInfo.querySelectorAll("span");
			let dyId = spans[0].innerText;
			let likeText = spans[3].innerText;
			let likeNums = convertToNumber(likeText);
			let fansText = spans[5].innerText
			let fansNums = convertToNumber(fansText);
			let userUrl = node.parentElement.parentElement.href;
			let intro = bInfo.nextElementSibling.innerText;
			let wxIds = extractWeChatIds(intro);
			let dataItem = {
				"name": name,
				"dyid": dyId,
				"like_text": likeText,
				"like_nums": likeNums,
				"user_url": userUrl,
				"fans_nums": fansNums,
				"fans_text":fansText,
				"intro":intro,
				"wx_ids":wxIds
			};
			//console.log(wxIds,intro);
			downloadData.push(dataItem);
		});

		bItems.forEach((node) => {
			// 操作每个节点的代码
			let nItem = node.parentElement.parentElement.parentElement.parentElement.nextElementSibling;
			let name = nItem.innerText;
			let bInfo = node.parentElement.parentElement.parentElement.parentElement.parentElement.nextElementSibling;
			let spans = bInfo.querySelectorAll("span");
			let dyId = spans[0].innerText;
			let likeText = spans[3].innerText;
			let likeNums = convertToNumber(likeText);
			let fansText = spans[5].innerText
			let fansNums = convertToNumber(fansText);
			let userUrl = node.parentElement.parentElement.parentElement.href;
			let intro = bInfo.nextElementSibling.innerText;
			let wxIds = extractWeChatIds(intro);
			let dataItem = {
				"name": name,
				"dyid": dyId,
				"like_text": likeText,
				"like_nums": likeNums,
				"user_url": userUrl,
				"fans_nums": fansNums,
				"fans_text":fansText,
				"intro":intro,
				"wx_ids":wxIds
			};
			//console.log(dataItem);
			downloadData.push(dataItem);
		});

	}
	//console.log(downloadData);
	return downloadData;
}

/**
 * 点赞量转数字
 * @param str
 * @returns {number|number}
 */
function convertToNumber(str) {
	const match = str.match(/(\d+(\.\d+)?)/);
	if (match) {
		const num = parseFloat(match[1]);
		return str.includes("万") ? num * 10000 : num;
	}
	return NaN;
}

/**
 * 格式化csv内容特殊字符
 * @param value
 * @returns {string}
 */
function formatCSVValue(value) {
	if (typeof value === 'string') {
		if (/[",\n\t]/.test(value)) {
			value = value.replace(/"/g, '""');
			value = `"${value}"`;
		}
	}
	return value;
}

/**
 * 把数组转换成csv内容
 * @param data
 * @returns {string}
 */
function convertToCSVContent(data,header=[],keysArr = []) {
	let pHeader = header.length == 0 ? ["作者", "标题", "点赞文本", "点赞数量", "视频地址", "日期"] : header;
	let pKeysArr = keysArr.length ==0 ? ["auther", "title", "like_text", "like_nums", "video_url", "date_str"] : keysArr;
	const rows = data.map(row => pKeysArr.map(key => formatCSVValue(row[key])).join(","));
	return [pHeader.join(",")].concat(rows).join("\n");
}

/**
 * 微信号提取
 * @param text
 * @returns {null|*}
 */
function extractWeChatIds(text) {
	const regex = /[\w\-+.]{6,20}/g; // 贪婪匹配，匹配包含字母、数字、下划线、连字符、加号和点号的字符序列
	const matches = text.match(regex);
	if (matches && matches.length > 0) {
		return matches.join("、");
	}
	return null; // 未找到微信号
}



// 在页面加载完成后插入弹层和引入CSS文件
window.onload = function() {
	if(currentDomain.includes("www.douyin.com"))
	{
		initPromptMessagePopup();
		initDownloadButton();
		initOtherActon();
		addStylesheet("css/page_layer.css");
	}
};
/**
 * 事件监听
 */
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	window.focus();
	console.log(message.type);
	if(message.type == 'direct_download')
	{
		startDownload();
	}
	else if(message.type == 'web_spider_error')
	{
		showPromptMessagePopup("视频下载异常，请重新点击下载！");
	}
	else if(message.type == 'web_spider_complete')
	{
		closeLoadingProgressBar();
	}
	else if(message.type == 'check_mkey_complete')
	{
		activiteDownloadButton();
		if(message.data.hasOwnProperty("code") && message.data.code !=0)
		{
			showPromptMessagePopup(message.data.message);
		}
		else
		{
			startDownload();
		}
	}
});
