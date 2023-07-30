import './css/index.css'
import './css/breakpoints.css'

// 生成唯一id
function UUID() {
    var s = []
    var hexDigits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    for (var i = 0; i < 16; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 16), 1)
    }
    return 'uuid-' + s.join("")
}

// 使用正则表达式将谷歌浏览器导出的书签文件中的链接书签名和地址提取出来
function extractLinksFromHtml(content) {
    const regex = /<A[^>]+HREF\s*=\s*['"]([^'"]+)['"][^>]*>([^<]+)/g
    const links = []

    let match
    while ((match = regex.exec(content))) {
        const url = match[1].split('?')[0]
        const name = match[2]
        links.push({ url, name })
    }

    return links
}

function guessFaviconUrl(url) {
    var protocolAndDomain = /^(https?:\/\/)?[^/]+/.exec(url)[0]

    // 拼接默认的 favicon 地址
    var guessFaviconUrl = protocolAndDomain + '/favicon.ico'
    if (checkFaviconExists(guessFaviconUrl)) {
        return guessFaviconUrl
    }

    return ''
}

// 检查 favicon 是否存在的方法
function checkFaviconExists(url) {
    // 创建一个新的 Image 对象
    var img = new Image()

    // 设置 Image 对象的 src 属性为待检查的 favicon 地址
    img.src = url

    // 监听 Image 对象的 load 和 error 事件
    return new Promise((resolve, reject) => {
        img.onload = function () {
            resolve(true)
        }

        img.onerror = function () {
            reject(false)
        }
    })
}

function getFirstCharacterOrWord(str) {
    // 移除首尾空格
    str = str.trim()

    // 检查是否包含空格
    if (str.indexOf(' ') !== -1) {
        // 获取第一个单词
        return str.split(' ')[0]
    } else {
        // 获取第一个字母
        return str.charAt(0)
    }
}

// 根据顶级域名生成不同的配色
function getColorByDomain(url) {
    const colorStrategies = {
        com: '#409EFF',  // 亮蓝色
        cn: '#F56C6C',   // 亮红色
        net: '#faad14',  // 亮橙色
        org: '#67C23A',  // 亮绿色
        edu: '#9254de',  // 亮紫色
        gov: '#E6A23C',  // 亮黄色
        io: '#36cfc9',   // 亮青色
        default: '#909399' // 亮灰色
    }

    const domain = url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n?]+)/i) || [url]
    const topLevelDomain = domain[1].split('.').slice(-1)[0]

    const colorStrategy = colorStrategies[topLevelDomain] || colorStrategies.default

    return colorStrategy
}

// 书签类
class Link {
    constructor({ name, url, id, ...args }) {
        if (!name || !url) {
            throw new Error('参数丢失！')
        }
        Object.assign(this, { name, url, id, ...args })
        if (!id) {
            this.id = UUID()
        }
    }
}

// 书签容器类
class LinkContainer {
    constructor() {
        const linksData = window.localStorage.getItem('links')
        const links = JSON.parse(linksData) || []

        this.links = links
        this.count = links.length || 0
        this.editLinkID = null
        this.operate = ''
    }

    // 修改书签类的操作状态
    changeOperateStatus(status) {
        this.operate = status
    }

    // 新增书签
    insertLink(linkObj) {
        const newLink = new Link(linkObj)
        this.links.unshift(newLink)
        this.count++
        if (this.operate !== 'batchAdd') {
            this.operate = 'add'
        }
        render()
    }

    // 新增书签
    addLink(linkObj) {
        const newLink = new Link(linkObj)
        this.links.push(newLink)
        this.count++
        if (!['batchAdd', 'batchAddSuccess'].includes(this.operate)) {
            this.operate = 'add'
        }
        render()
    }

    // 删除书签
    delLink(linkID) {
        const index = this.getIndexByID(linkID)
        if (index !== -1) {
            this.links.splice(index, 1)
            this.count--
            if (!['deleteAll', 'deleteAllSuccess'].includes(this.operate)) {
                this.operate = 'delete'
            }
            render()
            return
        }
    }

    // 根据ID更新书签
    updateLinkByID(linkObj) {
        const index = this.getIndexByID(linkObj.id)
        Object.assign(this.links[index], linkObj)
        this.editLinkID = null
        this.operate = 'update'
        render()
    }

    // 根据ID查找书签
    findLinkByID(linkID) {
        return this.links.find(item => item.id === linkID)
    }

    // 获取全部书签
    getAllLinks() {
        return this.links
    }

    // 根据ID获取书签的索引
    getIndexByID(linkID) {
        const link = this.links.find(item => item.id === linkID)
        return this.links.indexOf(link)
    }

    // 判断是否已经存在该书签
    hasThisLink(linkID) {
        const index = this.getIndexByID(linkID)
        return index !== -1
    }

    // 书签容器是否为空
    isLinkContainerEmpty() {
        return this.count === 0
    }

    // 将所有书签导出为 json 文件
    exportToJson() {
        const json = JSON.stringify(this.links, null, 2)
        const blob = new Blob([json], { type: "application/json" })
        const url = URL.createObjectURL(blob)

        const link = document.createElement("a")
        link.href = url
        link.download = "bookmarks.json"
        link.click()

        URL.revokeObjectURL(url)

        console.log("书签已成功导出为 JSON 文件！")
    }

    // 把指定ID的书签置为编辑状态 参数为空则退出编辑状态
    setLinkEditStatus(linkID) {
        if (!linkID) {
            this.editLinkID = null
            return
        }
        this.editLinkID = linkID
    }
}

// 清空localStorage中的书签缓存
document.getElementById('resetButton').addEventListener("click", () => {
    window.localStorage.removeItem('links')
    location.reload()
})

// 渲染新增和编辑表单模态框
const renderInputModal = () => {
    const inputModal = document.getElementById('inputModal')
    inputModal.style.visibility = 'visible'

    const inputModalTitle = linkContainer.editLinkID ? '编辑书签' : '添加书签'
    const inputModalSubmitText = linkContainer.editLinkID ? '立即修改' : '立即添加'

    const { id = '', name = '', url = '', iconUrl = '' } = linkContainer.findLinkByID(linkContainer.editLinkID) || {}

    const content = `
        <header class="inputModalTitle">${inputModalTitle}</header>
        <form id="inputModalForm" class="inputModalForm" autocomplete="off">
            <div class="form-item" style="display:none;">
                <input name="id" value="${id}" type="text">
            </div>
            <div class="form-item">
                <label for="name">书签名称：</label>
                <input id="name" name="name" value="${name}" required type="text">
            </div>
            <div class="form-item">
                <label for="url">链接地址：</label>
                <input id="url" name="url" value="${url}" required type="text">
            </div>
            <div class="form-item">
                <label for="iconUrl">书签图标：</label>
                <input id="iconUrl" name="iconUrl" value="${iconUrl}" type="text">
            </div>
            <div class="form-item">
                <button type="submit">${inputModalSubmitText}</button>
            </div>
        </form>
    `

    const modalContainer = document.createElement('div')
    modalContainer.id = 'modalContainer'
    modalContainer.innerHTML = content
    modalContainer.className = 'modalContainer'

    const oldModalContainer = document.getElementById('modalContainer')

    if (oldModalContainer) {
        inputModal.replaceChild(modalContainer, oldModalContainer)
    } else {
        inputModal.appendChild(modalContainer)
    }

    // 监听添加书签模态框的提交事件
    document.getElementById('inputModalForm').addEventListener('submit', (e) => {
        e.preventDefault()
        const formData = new FormData(e.target)
        const linkObj = Object.fromEntries(formData.entries())

        if (linkContainer.editLinkID) {
            linkContainer.updateLinkByID(linkObj)
        } else {
            linkContainer.insertLink(linkObj)
        }

        inputModal.style.visibility = 'hidden'
    })
    // 监听点击遮罩关闭模态框
    document.getElementById('modalCover').addEventListener('click', () => {
        const inputModal = document.getElementById('inputModal')
        inputModal.style.visibility = 'hidden'
        linkContainer.setLinkEditStatus()
    })
}

// 添加事件监听处理
const addEventsListenHandle = () => {
    // 书签从json文件导入
    document.getElementById("jsonFileInput").addEventListener('change', event => {
        const file = event.target.files[0]
        const reader = new FileReader()
        reader.readAsText(file)
        reader.onload = event => {
            const content = event.target.result
            const links = JSON.parse(content)
            const count = links.length
            const delay = Math.floor(10_000 / count)
            linkContainer.changeOperateStatus('batchAdd')
            links.forEach((item, index) => {
                if (!linkContainer.hasThisLink(item.id)) {
                    setTimeout(() => {
                        if (index === count - 1) {
                            linkContainer.changeOperateStatus('batchAddSuccess')
                            linkContainer.addLink(item)
                        } else {
                            linkContainer.addLink(item)
                        }
                    }, index * delay)
                }
            })
        }
    }, false)

    // 书签从html文件导入
    document.getElementById("htmlFileInput").addEventListener("change", event => {
        const file = event.target.files[0]
        const reader = new FileReader()
        reader.readAsText(file)
        reader.onload = (event) => {
            const content = event.target.result
            const links = extractLinksFromHtml(content)
            const count = links.length
            const delay = Math.floor(10_000 / count)
            linkContainer.changeOperateStatus('batchAdd')
            links.forEach((item, index) => {
                if (!linkContainer.hasThisLink(item.id)) {
                    setTimeout(() => {
                        if (index === count - 1) {
                            linkContainer.changeOperateStatus('batchAddSuccess')
                            linkContainer.addLink(item)
                        } else {
                            linkContainer.addLink(item)
                        }
                    }, index * delay)
                }
            })
        }
    }, false)
    // 清空按钮点击事件监听
    document.getElementById('clearButton').addEventListener('click', () => {
        const links = linkContainer.getAllLinks()
        const count = linkContainer.count
        const delay = Math.ceil(10_000 / linkContainer.count)
        linkContainer.changeOperateStatus('deleteAll')
        links.forEach((item, index) => {
            setTimeout(() => {
                if (index === count - 1) {
                    linkContainer.changeOperateStatus('deleteAllSuccess')
                    linkContainer.delLink(item.id)
                } else {
                    linkContainer.delLink(item.id)
                }
            }, index * 10)
        })
    })
    // 点击添加按钮打开新增书签模态框
    document.getElementById('addButton').addEventListener('click', () => renderInputModal())
    document.getElementById('manualInput').addEventListener('click', () => renderInputModal())

    const container = document.getElementById('container')

    // 监听书签长按事件
    container.addEventListener('mousedown', function (event) {
        let isLongPress = false
        const targetElement = event.target
        if (targetElement.className === 'link-name') {
            return
        }
        const delButton = targetElement.previousElementSibling
        let timer = setTimeout(() => {
            isLongPress = true
            delButton.style.display = 'block'
        }, 1000)

        container.addEventListener('mouseleave', () => {
            isLongPress = false
            delButton.style.display = 'none'
        })
        // 为解决在严格模式下argument.callee不生效导致长按图标依然跳转的问题而改写成具名函数
        function mouseupHandle() {
            clearTimeout(timer)
            container.removeEventListener('mouseup', mouseupHandle)

            if (isLongPress) {
                event.preventDefault()

                const linkID = targetElement.getAttribute('data-id')
                linkContainer.delLink(linkID)
            }

            targetElement.addEventListener('click', (event) => {
                if (isLongPress) {
                    event.preventDefault()
                    event.stopPropagation()
                }
                isLongPress = false
            })
            isLongPress = false
        }

        container.addEventListener('mouseup', () => mouseupHandle())
    })



    // 监听右键事件
    container.addEventListener('contextmenu', (event) => {
        const targetElement = event.target
        if (targetElement.className === 'link-name') {
            return
        }
        const { offsetLeft, offsetTop } = targetElement.parentNode
        event.preventDefault()
        let customMenuTimer
        const customMenu = document.createElement('ul')
        customMenu.id = 'customMenu'
        const menuItem1 = document.createElement('li')
        menuItem1.textContent = '✍️'
        customMenu.appendChild(menuItem1)

        // 监听第一个菜单的点击事件
        menuItem1.addEventListener('click', () => {
            const linkID = targetElement.getAttribute('data-id')
            linkContainer.setLinkEditStatus(linkID)
            renderInputModal()
            document.body.removeChild(customMenu)
        })

        const rect = targetElement.getBoundingClientRect()
        customMenu.style.left = offsetLeft + rect.width + 'px'
        customMenu.style.top = offsetTop + rect.height + 'px'

        const oldCustomMenu = document.getElementById('customMenu')
        if (oldCustomMenu) {
            document.body.replaceChild(customMenu, oldCustomMenu)
        } else {
            document.body.appendChild(customMenu)
        }
        customMenuTimer = setTimeout(() => {
            const customMenu = document.getElementById('customMenu')
            if (customMenu) {
                document.body.removeChild(customMenu)
            }
        }, 3000)
    })
}

// 渲染页脚内容
document.getElementById('pageFooter').innerHTML = (() => {
    const thisYear = new Date().getFullYear()
    return `
        <div>Designed & Powerd by DoubledConG</div>
        <div>Copyright© Long time ago - ${thisYear} 小葱伴逗虎</div>
        <a href="https://beian.miit.gov.cn/" target="_blank">闽ICP备2023000976号-1</a>
    `
})()

// 渲染全局消息提示
const renderMessageBox = () => {
    const messageContainer = document.createElement('div')
    messageContainer.className = 'messageContainer'

    const operateResultsMap = {
        'batchAdd': '书签正在导入中...',
        'deleteAll': '正在清空书签中...',
        'batchAddSuccess': '书签导入成功!',
        'deleteAllSuccess': '清空成功!',
        'add': '添加成功!',
        'delete': '删除成功!',
        'update': '修改成功!',
    }
    const { operate } = linkContainer
    if (!Object.keys(operateResultsMap).includes(operate)) {
        return
    }
    const messageContent = `
        <img src="https://image-1258911198.cos.ap-guangzhou.myqcloud.com/success.svg" class="message-type" />
        <span class="message-text"> ${operateResultsMap[operate]} </span>
    `

    messageContainer.innerHTML = messageContent

    if (['batchAdd', 'deleteAll'].includes(operate)) {
        messageContainer.id = 'underwayMsg'

        if (document.getElementById('underwayMsg')) {
            document.body.replaceChild(messageContainer, document.getElementById('underwayMsg'))
        } else {
            document.body.appendChild(messageContainer)
        }
    } else {
        messageContainer.id = 'resultMsg'

        const resultMsg = document.getElementById('resultMsg')
        const underwayMsg = document.getElementById('underwayMsg')

        if (underwayMsg) {
            document.body.replaceChild(messageContainer, underwayMsg)
        } else if (resultMsg) {
            document.body.replaceChild(messageContainer, resultMsg)
        } else {
            document.body.appendChild(messageContainer)
        }

        setTimeout(() => {
            if (document.getElementById('resultMsg')) {
                document.body.removeChild(messageContainer)
            }
        }, 4000)
    }
}

// 渲染介绍文本
const renderInroduce = () => {
    const introduce = document.getElementById("introduce")
    const texts = [
        "你是否也在浏览器收藏了许多书签🧐",
        "但是随着网上冲浪时间增加😭书签栏开始变得乱七八糟",
        "不妨试试这款小工具🤩简单操作让你的书签一览无余",
        "🤩就从导入书签文件或者手动添加一个书签开始吧 ! "
    ]
    const delay = 150 // 打字速度，单位为毫秒

    let textIndex = 0
    let charIndex = 0
    // 打字函数
    const type = () => {
        if (linkContainer.count !== 0) return
        if (charIndex < texts[textIndex].length) {
            introduce.textContent += texts[textIndex][charIndex]
            charIndex++
            setTimeout(type, delay)
        } else {
            setTimeout(erase, delay * 5) // 等待一段时间后开始擦除
        }
    }
    // 擦除函数
    const erase = () => {
        if (charIndex > 0) {
            introduce.textContent = introduce.textContent.slice(0, -1)
            charIndex--
            setTimeout(erase, delay)
        } else {
            textIndex = (textIndex + 1) % texts.length // 循环遍历文本数组
            setTimeout(type, delay)
        }
    }

    const getText = count => {
        if (count > 99) {
            return `太厉害了,你竟然收藏了${count}个书签啦!`
        } else if (count > 49) {
            return `真不错,已经有${count}个书签了呢`
        } else if (count > 19) {
            return `可以哟,你已经添加了${count}个书签了`
        } else if (count > 9) {
            return `你现在只有${count}个书签,快点再添加一些吧`
        } else {
            return `太糟糕了,你的书签数量为${count},少得可怜`
        }
    }
    const count = linkContainer.count
    introduce.innerHTML = ''
    if (count === 0) {
        type()
    } else {
        introduce.innerHTML = getText(count)
    }
}

// 渲染
const render = () => {
    const links = linkContainer.getAllLinks()

    const inputContainer = document.getElementById('inputContainer')
    inputContainer.style.visibility = links.length ? 'hidden' : 'visible'

    const controlsContainer = document.getElementById('controlsContainer')
    controlsContainer.style.visibility = links.length ? 'visible' : 'hidden'

    document.getElementById('linksCount').innerHTML = linkContainer.count

    window.localStorage.setItem('links', JSON.stringify(links))

    const content = links.map(item => {

        let linkIcon = `
            <div class="link-icon" 
                data-id="${item.id}" 
                style="background-color:${getColorByDomain(item.url)};" 
                title="${item.name}">
                ${getFirstCharacterOrWord(item.name)} 
            </div>
        `

        if (item.iconUrl) {
            linkIcon = `
                <img src="${item.iconUrl}"
                    class="link-icon" 
                    data-id="${item.id}" 
                    title="${item.name}">
                </img>
            `
        }

        return `<a class="link-item" target="_blank" href="${item.url}"> 
            <div class="del-button">-</div>  
            
           ${linkIcon}
            
            <div class="link-name"> ${item.name} </div>   
        </a>`
    }).join('')
    document.getElementById('container').innerHTML = content
    addEventsListenHandle()
    renderInroduce()
    renderMessageBox()
}

// 书签容器实例化
const linkContainer = new LinkContainer()
window.onload = () => render()