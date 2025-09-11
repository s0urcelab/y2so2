import browser from "webextension-polyfill"

/**
 * 搜索引擎集中配置
 * key 作为引擎标识；id 用于 contextMenus；title 用于菜单展示；buildUrl 用于拼接搜索链接
 * @type {Record<string, { id: string, title: string, buildUrl: (imageUrl: string) => string }>}
 */
const SEARCH_ENGINES = {
	google: {
		id: 'engine:google',
		title: 'Google识图',
		buildUrl: (imageUrl) => `https://lens.google.com/uploadbyurl?url=${imageUrl}`,
	},
	yandex: {
		id: 'engine:yandex',
		title: 'Yandex',
		buildUrl: (imageUrl) => `https://yandex.ru/images/search?rpt=imageview&url=${encodeURIComponent(imageUrl)}`,
	},
	bing: {
		id: 'engine:bing',
		title: 'Bing视觉搜索',
		buildUrl: (imageUrl) => `https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${encodeURIComponent(imageUrl)}`,
	},
	saucenao: {
		id: 'engine:saucenao',
		title: 'SauceNAO',
		buildUrl: (imageUrl) => `https://saucenao.com/search.php?url=${encodeURIComponent(imageUrl)}`,
	},
	tracemoe: {
		id: 'engine:tracemoe',
		title: 'trace.moe',
		buildUrl: (imageUrl) => `https://trace.moe/?url=${encodeURIComponent(imageUrl)}`,
	},
}

/**
 * 统一打开搜索标签页
 * @param {string} engineKey - 引擎标识（SEARCH_ENGINES 的 key）
 * @param {string} imageUrl - 图片地址
 */
function openSearch(engineKey, imageUrl) {
	const engine = SEARCH_ENGINES[engineKey]
	if (!engine) return
	const searchUrl = engine.buildUrl(imageUrl)
	browser.tabs.create({ url: searchUrl })
}

// 创建右键菜单及子菜单（基于配置动态生成）
browser.runtime.onInstalled.addListener(() => {
	// 创建父菜单
	const parentMenuId = browser.contextMenus.create({
		id: 'imageSearch',
		title: '以图搜图',
		contexts: ['image']
	});

	// 创建子菜单
	Object.entries(SEARCH_ENGINES).forEach(([, engine]) => {
		browser.contextMenus.create({
			id: engine.id,
			parentId: parentMenuId,
			title: engine.title,
			contexts: ['image']
		});
	})
});

// 处理菜单点击事件
browser.contextMenus.onClicked.addListener((info, tab) => {
	// 获取图片URL
	const imageUrl = info.srcUrl;

	// 根据菜单 id 反查引擎并执行
	const engineKey = Object.keys(SEARCH_ENGINES).find(key => SEARCH_ENGINES[key].id === info.menuItemId)
	if (engineKey && imageUrl) {
		openSearch(engineKey, imageUrl)
	}
})

// 监听来自popup的消息
browser.runtime.onMessage.addListener((message) => {
	if (message?.type === 'searchByImageUrl' && message?.imageUrl) {
		const allEngineKeys = Object.keys(SEARCH_ENGINES)
		const engines = Array.isArray(message.engines) && message.engines.length > 0
			? message.engines.filter((k) => allEngineKeys.includes(k))
			: allEngineKeys
		const url = message.imageUrl

		// 逐个引擎打开新标签页
		engines.forEach((engineKey) => openSearch(engineKey, url))
	}
})



