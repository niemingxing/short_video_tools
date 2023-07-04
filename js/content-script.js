let currentDomain = window.location.hostname;

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
 * 初始化弹层
 */
function initDownloadButton() {
	const html = '<div class="gpt-sr-container">\n' +
		'    <div class="gpt-sr-sidebar">\n' +
		'      <button id="gpt-sr-toggleButton">立即下载</button>\n' +
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
// 在页面加载完成后插入弹层和引入CSS文件
window.onload = function() {
	if(currentDomain.includes("www.douyin.com"))
	{
		initPromptMessagePopup();
		initDownloadButton();
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
