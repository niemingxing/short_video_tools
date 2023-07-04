chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        console.log(request.type);
        if (request.type === "init_setting")
        {
            console.log(request.setting);
            sendResponse({ farewell: "Background runtime onMessage!" });
        }
        else if(request.type == "web_spider_collect")
        {
            openTabSpiderColletc(request.url)
        }
        else if(request.type == "web_spider_complete")
        {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                //chrome.tabs.sendMessage(tabs[0].id, {'data':request.data,type:'web_spider_complete'});
            });
        }
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
                                        console.log("Error downloading the video:", error);
                                    });
                            }

                            console.log("开始采集");
                            let title = document.title;
                            let intervalId = setInterval(function (){
                                const videoElement = document.querySelector(".xg-video-container video");
                                const videoDetailElement = document.querySelector("div.detail-video-info");
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
