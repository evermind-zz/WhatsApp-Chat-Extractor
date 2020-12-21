// ==UserScript==
// @name         WhatsApp Web
// @version      1.0
// @description  Save WhatsApp chats to PDF
// @author       RootDev4 (Chris)
// @match        https://web.whatsapp.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==



const timeInterval = 500 // in milliseconds

// Scroll up to load all content
// TODO: find alternative for setInterval() function
function getAllContent(wrapper) {
    return new Promise((resolve, reject) => {
        let scrollWrapper = setInterval(() => {
            wrapper.scroll(0, (wrapper.scrollHeight * -1))
            if (wrapper.childNodes.length === 2) {
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

//
function getChatMessages(content) {
    return new Promise((resolve, reject) => {
        let messages = []

        content.querySelectorAll('.message-in, .message-out').forEach(message => {
            let data = message.querySelector('div[data-pre-plain-text]') || null
            
            if (data) {
                messages.push({
                    'id': message.getAttribute('data-id') || null,
                    'date': data.getAttribute('data-pre-plain-text').match(/\[(.*)\]/)[1] || null,
                    'name': data.getAttribute('data-pre-plain-text').split('] ')[1] || null,
                    'owner': (message.classList.contains('message-out')) ? true : false
                })
            } else {
                console.log(data)
            }
        })

        resolve(messages)
    })
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
                document.documentElement.style.overflow = 'visible'
                document.body.style.overflow = 'visible'
                document.body.innerHTML = content.innerHTML
                //getChatMessages(content).then(result => console.log(result)).catch(error => console.log(error))
                
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

//
(() => {
    'use strict'

    window.onload = () => {  
        let wrapper = document.querySelector('div#main') || null
        let checkWrapper = setInterval(() => {
            wrapper = document.querySelector('div#main')
            
            if (wrapper) {
                clearInterval(checkWrapper)
                showButtons(wrapper)
            }
        }, timeInterval)
    }
})()
