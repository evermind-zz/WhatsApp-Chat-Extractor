// ==UserScript==
// @name         WhatsApp Web
// @version      1.1
// @description  Save WhatsApp chats to json
// @author       RootDev4 (Chris)
// @match        https://web.whatsapp.com/*
// @require      https://raw.githubusercontent.com/Stuk/jszip/master/dist/jszip.js
// @require      https://raw.githubusercontent.com/eligrey/FileSaver.js/master/dist/FileSaver.js
// @grant        none
// @run-at       document-end
/* globals $, jszip, FileSaver */
// ==/UserScript==



const timeInterval = 500 // in milliseconds
var outputFileNamePostfix = "unknown"

// Scroll up to load all content
// TODO: find alternative for setInterval() function
function getAllContent(wrapper) {
    return new Promise((resolve, reject) => {
        let scrollWrapper = setInterval(() => {
            wrapper.scroll(0, (wrapper.scrollHeight * -1))
            if (wrapper.childNodes.length === 3) {
                clearInterval(scrollWrapper)
                resolve()
            }
        }, timeInterval)
    })
}

//
// TODO
function downloadMedia(content) {
    return new Promise((resolve, reject) => {
        content.querySelectorAll('.message-in, .message-out').forEach(message => {
            // TODO: auto download images/videos
            resolve()
        })
    })
}

function DOMRegex(data, regex) {
    let output = [];
    for (let i of data.querySelectorAll('*')) {
        for (let j of i.attributes) {
            if (regex.test(j.value)) {
                output.push({
                    'element': i,
                    'attribute name': j.name,
                    'attribute value': j.value
                });
            }
        }
    }
    return output;
}

function initiateLocalFileDownload(filename, text) {
  var element = document.createElement('a')
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
  element.setAttribute('download', filename)

  element.style.display = 'none'
  document.body.appendChild(element)

  element.click();

  document.body.removeChild(element);
}


function zipper(imgData) {
    var zip = new JSZip();

    zip.file("Hello.txt", "Hello World\n");

    var img = zip.folder("images");
    img.file("smile.jpg", imgData, {base64: false});

    zip.generateAsync({type:"blob"}).then(function(content) {
	    // see FileSaver.js
	    saveAs(content, "example.zip");
	    });
}


//
function getChatMessages(content) {
    return new Promise((resolve, reject) => {
        let messages = [] // all extracted messages

        content.querySelectorAll('.message-in, .message-out').forEach(message => {
            let data = null

            // vars for one message
            let id = null
            let date = null
            let name = null
            let owner = null
            let post = null

            try {
                id =  message.getAttribute('data-id') || null
                owner = (message.classList.contains('message-out')) ? true : false
            } catch(error){
                console.error("extracting id or owner failed")
                console.error(error)
            }

            try {
                data = message.querySelector('div[data-pre-plain-text]') || null // this only get the plain text no images only
            } catch(error) {
                console.error("message stuff")
                console.error(error)
            }

            if (data) { // got mostly plain text data

                var messageText = ""
                try {
                    var messageText = data.querySelector('span._3-8er.selectable-text.copyable-text > span');

                    if (messageText == null) { // it happens as _3-8er is not always there
                        var result = DOMRegex(data, /selectable-text/)
                        messageText = result[0].element.firstElementChild // TODO check for result
                    }

                    if (messageText != null) {
                        NodeList.prototype.forEach = Array.prototype.forEach
                        var children = messageText.childNodes;
                        children.forEach(function(child){
                            var nodeType = child.nodeType
                            if (nodeType == 1) { // 1 means image/url type eg. smiley
                                var rawText = child.getAttribute('data-plain-text'); // smiley case
                                if (rawText == null) {
                                    rawText = child.getAttribute("href") // url case
                                }
                                if (rawText != null) { // only replace if you have something meaningful
                                    var textnode = document.createTextNode(rawText);
                                    messageText.replaceChild(textnode, child);
                                }
                            } else if (nodeType == 3) { // 3 means text type
                            } else {
                                console.info(child.nodeName)
                            }
                        });
                    } else {
                        console.error("messageText is null")
                    }

                    post = messageText.textContent
                } catch(error){
                    console.error("message extraction failed")
                    console.error(error)
                }

                try {
                    date = data.getAttribute('data-pre-plain-text').match(/\[(.*)\]/)[1] || null
                    name = data.getAttribute('data-pre-plain-text').split('] ')[1] || null
                } catch(error){
                    console.error("date or name extraction failed")
                    console.error(error)
                }


            } else { // none plain text data eg. image only/video/audio
                console.info("data is null")
		// get url for blob
                // TODO get first to click download for the image/video/audio to extract
                // the blob
                /*
                var blobPart = DOMRegex(message, /blob/)
                    if (blobPart != null && blobPart[0] != null) {

                        var url = blobPart[0].element.getAttribute("src")
                            fetch(url).then(function(response) {
                                    return response.blob();
                                    }).then(function(myBlob) {
                                        zipper(myBlob)
                                        });
                    }
                    */
            }

            messages.push({
                'id': id,
                'date': date,
                'name': name,
                'owner': owner,
                'message' : post
            })
        })
        resolve(messages)
    })
}

function writeJsonFileAndLetUserDownload(result) {
    console.log(result)
    if ( outputFileNamePostfix == null) {
        outputFileNamePostfix = "unknown"
    }

    let filename = getDateString() + "_" + outputFileNamePostfix + ".json"

    initiateLocalFileDownload(filename, JSON.stringify(result, null, 2))
}

//
async function runExtractionRoutine(wrapper) {
    if (wrapper.childNodes[4]) {
        const frame = wrapper.childNodes[4].querySelector('div.copyable-area > div')

        if (frame) {
            await getAllContent(frame)
            const content = frame.querySelector('div[role="region"]')
            const msgLen = content.querySelectorAll('.message-in, .message-out').length

            if (confirm(`${msgLen} messages found in chat. Continue?`)) {
                await downloadMedia(content)
                // document.documentElement.style.overflow = 'visible'
                // document.body.style.overflow = 'visible'
                // document.body.innerHTML = content.innerHTML
                getChatMessages(content).then(result => writeJsonFileAndLetUserDownload(result)).catch(error => console.log(error))
                
                //const newWindow = window.open()
                //newWindow.document.write(content.innerHTML)
            } else {
                console.log('[DEBUG] Script aborted by user.')
            }
        } else {
            alert('Cannot find scrollable content area. Please reload and try again.')
        }
    }
}

//
function showButtons(wrapper) {
    return new Promise((resolve, reject) => {
        const header = wrapper.querySelector('header') || null
        
        if (header) {
            if (header.querySelector("#runExtractionRoutine") != null ) { // button already there
                resolve()
                return
            }
            const btn = document.createElement('button')
            btn.innerHTML = 'Save Chat'
            btn.id = 'runExtractionRoutine'
            btn.style.backgroundColor = 'green'
            btn.style.marginLeft = '10px'
            btn.onclick = () => runExtractionRoutine(wrapper)
            header.append(btn)

            resolve()
        } else {
            reject('Cannot find chat header. Please reload and try again.')
        }
    })
}

function wrapperChecker() {
    let checkWrapper = setInterval(() => {
        wrapper = document.querySelector('div#main')

        if (wrapper) {
            clearInterval(checkWrapper)
            showButtons(wrapper)
        }
    }, timeInterval)
}

function addLeadingZeros(n) {
    if (n <= 9) {
        return "0" + n;
    }
    return n
}

function getDateString() {
    let currentDatetime = new Date()
    let formattedDate = currentDatetime.getFullYear()
        + addLeadingZeros(currentDatetime.getMonth() + 1)
        + addLeadingZeros(currentDatetime.getDate())
        + "_"
        + addLeadingZeros(currentDatetime.getHours())
        + "-" + addLeadingZeros(currentDatetime.getMinutes())
        + "-" + addLeadingZeros(currentDatetime.getSeconds())
    return formattedDate
}

//
(() => {
    'use strict'

    window.onload = () => {  
        let wrapper = document.querySelector('div#main') || null

        // the whole purpose is to get the chat name for later use as part of the json filename
        document.addEventListener("click", function(evnt){
            console.log(evnt.target.id);
            if (evnt.target.id == "runExtractionRoutine" ) {
                try {
                    let output = evnt.target.parentElement.querySelector("span[title]").getAttribute("title")
                    if (output != null) {
                        // remove illegal characters from filename
                        output = output.replace(/[/\\?%*:|"<> ]/g, '-');

                        outputFileNamePostfix = output
                    }
                } catch (error) {
                    console.info("here is no title to extract, maybe another click will do:)")
                    console.info(error)
                }
            }

            wrapperChecker()
        });
    }
})()
