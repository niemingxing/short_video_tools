let mKey = '';
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        console.log(request.type);
        if (request.type === "init_setting")
        {
            console.log(request.setting);
        }
        else if(request.type == "web_spider_collect")
        {
            openTabSpiderColletc(request.url)
        }
        else if(request.type == "web_spider_complete")
        {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {'data':request.data,type:'web_spider_complete'});
            });
        }
        else if(request.type == "web_spider_error")
        {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {'data':request.data,type:'web_spider_error'});
            });
        }
        else if(request.type == 'check_mkey')
        {
            initSetting(function (){
                checkMKey(function (data){
                    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                        chrome.tabs.sendMessage(tabs[0].id, {'data':data,type:'check_mkey_complete'});
                    });
                });
            });
        }
        sendResponse({ farewell: "Background runtime onMessage!" });
    }
);

function openTabSpiderColletc(url)
{
    chrome.tabs.create({ url: url ,active: false}, (tab) => {
        // 监听标签页加载完成事件
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {

            if (tabId === tab.id && changeInfo.status === "complete") {
                // 从标签页中执行脚本以获取 DOM 内容
                chrome.scripting.executeScript(
                    {
                        target: { tabId: tab.id },
                        function: () => {
                            function downloadVideo(title,url, filename) {
                                fetch(url)
                                    .then(response => response.blob())
                                    .then(blob => {
                                        const link = document.createElement("a");
                                        link.href = URL.createObjectURL(blob);
                                        link.download = filename;
                                        link.click();
                                        URL.revokeObjectURL(link.href);
                                        chrome.runtime.sendMessage({ 'type': 'web_spider_complete',"data":{"title":title} });
                                        window.close();
                                    }).catch(error => {
                                    chrome.runtime.sendMessage({ 'type': 'web_spider_error',"data":{"title":title} });
                                    console.log("Error downloading the video:", error);
                                });
                            }

                            console.log("开始采集");
                            let title = document.title;
                            let intervalId = setInterval(function (){
                                const videoElement = document.querySelector(".xg-video-container video");
                                const videoDetailElement = document.querySelector("div[data-e2e-aweme-id]");
                                console.log(videoElement,videoDetailElement);
                                console.log("检测对象");
                                if(videoElement && videoDetailElement)
                                {
                                    let sourceElements = videoElement.querySelectorAll("source");
                                    let videoId = videoDetailElement.getAttribute("data-e2e-aweme-id");
                                    let sourceList = [];
                                    console.log("采集成功");
                                    sourceElements.forEach((node) => {
                                        // 操作每个节点的代码
                                        sourceList.push(node.getAttribute("src"));
                                    });
                                    console.log(sourceList);
                                    clearInterval(intervalId);

                                    const videoUrl = sourceList[1];
                                    const videoFilename = videoId + ".mp4";
                                    downloadVideo(title,videoUrl, videoFilename);
                                }
                            },1000);
                        },
                    },
                    () => {
                        // 关闭标签页
                        //chrome.tabs.remove(tab.id);
                    }
                );

                // 移除监听器
                chrome.tabs.onUpdated.removeListener(listener);
            }
        });
    });

}

/**
 * 检查mkey合法性
 */
function checkMKey(callback)
{
    if(mKey == '')
    {
        if(callback) callback({"code":"1002",'message':"没有配置密钥,请点击插件右上角设置！"});
        return;
    }
    fetch('https://idnsl.xyz/code/check_mkey',{
        method: 'POST',
        headers: {
            'Accept': 'application/json, */*',
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'cache': 'default',
            'x-ajax': 'true'
        },
        'credentials': 'include', //表示请求是否携带cookie
        body: "mkey=" + mKey
    })
        // fetch()接收到的response是一个 Stream 对象
        // response.json()是一个异步操作，取出所有内容，并将其转为 JSON 对象
        .then(response => response.json())
        .then(json => {
            console.log(json);
            if(callback) callback(json);
        })
        .catch(err => {
            console.log('Request Failed', err);
            if(callback) callback({"code":"1001",'message':"网络请求异常,密钥验证走外网域名,可以科学试下!"});
        });
}

function initSetting(callback)
{
    // 获取存储的值
    chrome.storage.local.get('nmx_video_setting', function (data) {
        mKey = (typeof data.nmx_video_setting.mkey !== 'undefined') ? data.nmx_video_setting.mkey : '';
        // 在这里使用存储的值
        console.log(mKey);
        if(callback) callback();
    });
}
