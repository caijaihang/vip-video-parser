// 全局变量（数据持久化，基于localStorage）
let videoLibrary = JSON.parse(localStorage.getItem('videoLibrary')) || [];
let selectedVideos = [];
let currentEditVideoId = null;
let currentParserType = 'vip';

// DOM加载完成后初始化（确保所有元素加载完毕再绑定事件）
document.addEventListener('DOMContentLoaded', () => {
    renderVideoLibrary();
    bindAllEvents();
});

// 统一事件绑定（优化可维护性，避免零散绑定）
function bindAllEvents() {
    bindMobileMenuEvents();
    bindVideoLibraryEvents();
    bindAddVideoEvents();
    bindParserEvents();
    bindModalEvents();
    bindBatchOperationEvents();
}

// 1. 移动端菜单事件
function bindMobileMenuEvents() {
    const menuToggle = document.getElementById('menu-toggle');
    const closeMenu = document.getElementById('close-menu');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    const mobileLinks = document.querySelectorAll('.mobile-link');

    const openMenu = () => {
        mobileMenu.classList.remove('translate-x-full');
        menuOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };

    const closeMenuHandler = () => {
        mobileMenu.classList.add('translate-x-full');
        menuOverlay.classList.add('hidden');
        document.body.style.overflow = '';
    };

    menuToggle.addEventListener('click', openMenu);
    closeMenu.addEventListener('click', closeMenuHandler);
    menuOverlay.addEventListener('click', closeMenuHandler);
    mobileLinks.forEach(link => link.addEventListener('click', closeMenuHandler));
}

// 2. 视频库相关事件
function bindVideoLibraryEvents() {
    // 视图切换
    const viewButtons = document.querySelectorAll('[data-view]');
    const videoViews = document.querySelectorAll('.video-view');

    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // 重置按钮状态
            viewButtons.forEach(b => {
                b.classList.remove('active', 'bg-blue-600');
                b.classList.add('bg-gray-700');
            });
            // 激活当前按钮
            btn.classList.add('active', 'bg-blue-600');
            const viewType = btn.dataset.view;
            // 切换视图
            videoViews.forEach(view => view.classList.add('hidden'));
            if (viewType === 'grid') {
                document.getElementById('video-grid-view').classList.remove('hidden');
            } else if (viewType === 'table') {
                document.getElementById('video-table-view').classList.remove('hidden');
            }
        });
    });

    // 筛选按钮
    const filterAllBtn = document.getElementById('filter-all-btn');
    const filterFreeBtn = document.getElementById('filter-free-btn');
    const filterVipBtn = document.getElementById('filter-vip-btn');

    filterAllBtn.addEventListener('click', () => {
        renderVideoLibrary();
        resetFilterButtons();
        filterAllBtn.classList.add('active');
    });

    filterFreeBtn.addEventListener('click', () => {
        const filtered = videoLibrary.filter(v => !v.isVip);
        renderVideoLibrary(filtered);
        resetFilterButtons();
        filterFreeBtn.classList.add('active');
    });

    filterVipBtn.addEventListener('click', () => {
        const filtered = videoLibrary.filter(v => v.isVip);
        renderVideoLibrary(filtered);
        resetFilterButtons();
        filterVipBtn.classList.add('active');
    });

    // 全选按钮
    document.getElementById('select-all').addEventListener('change', (e) => {
        selectedVideos = e.target.checked 
            ? videoLibrary.map(v => v.id) 
            : [];
        updateBatchToolbar();
        renderVideoLibrary();
    });

    // 空状态添加按钮
    document.getElementById('empty-add-video-btn').addEventListener('click', () => {
        document.getElementById('add-video').scrollIntoView({ behavior: 'smooth' });
    });

    // 添加视频按钮跳转
    document.getElementById('add-video-btn').addEventListener('click', () => {
        document.getElementById('add-video').scrollIntoView({ behavior: 'smooth' });
    });
}

// 重置筛选按钮状态
function resetFilterButtons() {
    [document.getElementById('filter-all-btn'), document.getElementById('filter-free-btn'), document.getElementById('filter-vip-btn')]
        .forEach(btn => btn.classList.remove('active'));
}

// 3. 添加视频相关事件
function bindAddVideoEvents() {
    const addVideoForm = document.getElementById('add-video-form');
    const manualDetectVip = document.getElementById('manual-detect-vip');
    const autoDetectVip = document.getElementById('auto-detect-vip');

    // 表单提交
    addVideoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('video-title').value.trim();
        const url = document.getElementById('video-url').value.trim();
        const category = document.getElementById('video-category').value;
        const duration = document.getElementById('video-duration').value.trim();
        const description = document.getElementById('video-description').value.trim();

        // 表单验证
        const [isValid, errorMsg] = validateAddVideoForm(title, url);
        if (!isValid) {
            alert(errorMsg);
            addVideoForm.classList.add('error-shake');
            setTimeout(() => addVideoForm.classList.remove('error-shake'), 500);
            return;
        }

        // 自动检测VIP状态
        let isVip = false;
        if (autoDetectVip.checked) {
            isVip = await detectVipStatus(url);
            showVipDetectionResult(isVip);
        }

        // 构建视频对象
        const newVideo = {
            id: Date.now().toString(),
            title,
            url,
            category,
            duration,
            description,
            isVip,
            platform: getPlatformFromUrl(url),
            addTime: new Date().toLocaleString()
        };

        // 保存到本地存储
        videoLibrary.push(newVideo);
        localStorage.setItem('videoLibrary', JSON.stringify(videoLibrary));

        // 重置表单+重新渲染
        addVideoForm.reset();
        document.getElementById('vip-detection-result').classList.add('hidden');
        renderVideoLibrary();
        alert('视频添加成功！');

        // 跳转到视频库
        document.getElementById('videos').scrollIntoView({ behavior: 'smooth' });
    });

    // 手动检测VIP
    manualDetectVip.addEventListener('click', async () => {
        const url = document.getElementById('video-url').value.trim();
        if (!url || !isValidUrl(url)) {
            alert('请先输入有效的视频链接！');
            return;
        }
        const isVip = await detectVipStatus(url);
        showVipDetectionResult(isVip);
    });
}

// 验证添加视频表单
function validateAddVideoForm(title, url) {
    if (!title) return [false, '请输入视频标题！'];
    if (!url) return [false, '请输入视频链接！'];
    if (!isValidUrl(url)) return [false, '请输入有效的视频链接（以http/https开头）！'];
    return [true, '验证通过'];
}

// 显示VIP检测结果
function showVipDetectionResult(isVip) {
    const resultContainer = document.getElementById('vip-detection-result');
    const statusIcon = document.getElementById('vip-status-icon');
    const statusText = document.getElementById('vip-status-text');

    resultContainer.classList.remove('hidden');
    if (isVip) {
        statusIcon.innerHTML = '<i class="fa fa-lock text-purple-400"></i>';
        statusText.textContent = '该视频是VIP付费视频，需要解析后播放';
    } else {
        statusIcon.innerHTML = '<i class="fa fa-unlock text-green-400"></i>';
        statusText.textContent = '该视频是免费视频，可直接播放';
    }
}

// 4. 视频解析相关事件
function bindParserEvents() {
    const analyzeBtn = document.getElementById('analyze-btn');
    const parserTypeItems = document.querySelectorAll('.radio-item');
    const parserUrlInput = document.getElementById('parser-video-url');
    const retryVipPlay = document.getElementById('retry-vip-play');
    const useFallbackPlayer = document.getElementById('use-fallback-player');
    const qualityBtns = document.querySelectorAll('.quality-btn');
    const parserButtons = document.querySelectorAll('.line-option');
    const downloadVipBtn = document.getElementById('download-vip-btn');

    // 切换解析类型
    parserTypeItems.forEach(item => {
        item.addEventListener('click', () => {
            parserTypeItems.forEach(i => i.classList.remove('active'));
            parserTypeItems.forEach(i => i.querySelector('.radio-dot').classList.remove('active'));
            item.classList.add('active');
            item.querySelector('.radio-dot').classList.add('active');
            currentParserType = item.dataset.parserType;
        });
    });

    // 立即解析按钮
    analyzeBtn.addEventListener('click', async () => {
        const url = parserUrlInput.value.trim();
        if (!url || !isValidUrl(url)) {
            parserUrlInput.classList.add('error-shake');
            setTimeout(() => parserUrlInput.classList.remove('error-shake'), 500);
            showParseError('请输入有效的视频链接！');
            return;
        }

        // 显示进度条
        const progressBar = document.querySelector('.parse-progress');
        const progressBarInner = document.querySelector('.parse-progress-bar');
        progressBar.classList.remove('hidden');
        progressBarInner.style.width = '0%';

        // 隐藏错误和结果
        hideParseError();
        hideParseResult();

        try {
            // 模拟解析进度（提升用户体验）
            const progressInterval = setInterval(() => {
                const currentWidth = parseInt(progressBarInner.style.width);
                if (currentWidth < 90) {
                    progressBarInner.style.width = `${currentWidth + 10}%`;
                }
            }, 300);

            // 调用Netlify Serverless函数进行真实解析
            const parseResult = await callParseVideoFunction(url, currentParserType);

            // 完成进度条
            clearInterval(progressInterval);
            progressBarInner.style.width = '100%';
            setTimeout(() => progressBar.classList.add('hidden'), 1000);

            // 渲染解析结果
            renderParseResult(parseResult);
            showParseResult();

            // 如果是VIP解析，直接打开播放模态框
            if (currentParserType === 'vip') {
                openVipPlayerModal(parseResult, url);
            }
        } catch (error) {
            clearInterval(progressInterval);
            progressBar.classList.add('hidden');
            showParseError(error.message || '解析失败，请更换线路重试！');
        }
    });

    // 重试VIP播放
    retryVipPlay.addEventListener('click', async () => {
        const vipVideoPlayer = document.getElementById('vip-video-player');
        const originalUrl = document.getElementById('vip-original-link').href;

        if (!originalUrl) return;

        // 显示加载状态
        document.getElementById('vip-player-loading').classList.remove('hidden');
        document.getElementById('vip-player-error').classList.add('hidden');

        try {
            const parseResult = await callParseVideoFunction(originalUrl, 'vip');
            vipVideoPlayer.src = parseResult.playUrl;
            document.getElementById('vip-player-loading').classList.add('hidden');
        } catch (error) {
            document.getElementById('vip-player-loading').classList.add('hidden');
            document.getElementById('vip-player-error').classList.remove('hidden');
        }
    });

    // 使用备用播放器
    useFallbackPlayer.addEventListener('click', () => {
        document.getElementById('vip-video-player').classList.add('hidden');
        document.getElementById('vip-player-container').classList.remove('hidden');
        document.getElementById('vip-player-error').classList.add('hidden');
        // 填充备用播放器视频源
        const parseResult = JSON.parse(localStorage.getItem('lastParseResult')) || {};
        if (parseResult.downloadUrl) {
            document.getElementById('fallback-video-source').src = parseResult.downloadUrl;
            document.getElementById('fallback-video-player').load();
        }
    });

    // 切换视频质量
    qualityBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            qualityBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // 真实项目中可根据质量重新请求解析接口
            const quality = btn.dataset.quality;
            const vipVideoPlayer = document.getElementById('vip-video-player');
            if (vipVideoPlayer.src) {
                vipVideoPlayer.src = `${vipVideoPlayer.src}&quality=${quality}`;
            }
        });
    });

    // 切换解析线路
    parserButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            parserButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const parser = btn.dataset.parser;
            const url = parserUrlInput.value.trim();
            if (url) {
                callParseVideoFunction(url, currentParserType, parser).then(result => {
                    renderParseResult(result);
                    showParseResult();
                });
            }
        });
    });

    // 下载视频提示
    downloadVipBtn.addEventListener('click', () => {
        const downloadHint = document.getElementById('download-hint');
        downloadHint.classList.remove('hidden');
        setTimeout(() => downloadHint.classList.add('hidden'), 5000);
    });
}

// 5. 模态框相关事件
function bindModalEvents() {
    // 关闭普通视频播放模态框
    document.querySelectorAll('.close-video').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = document.getElementById('video-player-modal');
            modal.classList.add('hidden');
            document.getElementById('fullscreen-video').src = '';
        });
    });

    // 关闭VIP视频播放模态框
    document.querySelectorAll('.close-vip-player').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = document.getElementById('vip-player-modal');
            modal.classList.add('hidden');
            document.getElementById('vip-video-player').src = '';
            document.getElementById('fallback-video-source').src = '';
        });
    });

    // 关闭编辑视频模态框
    document.querySelectorAll('.close-edit-video').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = document.getElementById('edit-video-modal');
            modal.classList.add('hidden');
            document.getElementById('edit-video-form').reset();
            currentEditVideoId = null;
        });
    });

    // 编辑视频表单提交
    document.getElementById('edit-video-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-video-id').value;
        const title = document.getElementById('edit-video-title').value.trim();
        const url = document.getElementById('edit-video-url').value.trim();
        const category = document.getElementById('edit-video-category').value;
        const description = document.getElementById('edit-video-description').value.trim();
        const isVip = document.getElementById('edit-video-is-vip').checked;

        // 验证
        if (!title || !url || !isValidUrl(url)) {
            alert('请输入有效的标题和视频链接！');
            return;
        }

        // 更新视频信息
        const index = videoLibrary.findIndex(v => v.id === id);
        if (index !== -1) {
            videoLibrary[index] = {
                ...videoLibrary[index],
                title,
                url,
                category,
                description,
                isVip,
                platform: getPlatformFromUrl(url)
            };
            // 保存到本地存储
            localStorage.setItem('videoLibrary', JSON.stringify(videoLibrary));
            // 重新渲染
            renderVideoLibrary();
            // 关闭模态框
            document.getElementById('edit-video-modal').classList.add('hidden');
            alert('视频信息更新成功！');
        }
    });
}

// 6. 批量操作相关事件
function bindBatchOperationEvents() {
    const batchSelectBtn = document.getElementById('batch-select-btn');
    const batchPlayBtn = document.getElementById('batch-play');
    const batchDeleteBtn = document.getElementById('batch-delete');
    const batchCancelBtn = document.getElementById('batch-cancel');

    // 开启批量选择
    batchSelectBtn.addEventListener('click', () => {
        selectedVideos = [];
        updateBatchToolbar();
        // 显示批量操作工具栏
        document.getElementById('batch-toolbar').classList.remove('hidden');
        // 重新渲染（显示复选框）
        renderVideoLibrary();
    });

    // 批量播放
    batchPlayBtn.addEventListener('click', () => {
        if (selectedVideos.length === 0) {
            alert('请先选择要播放的视频！');
            return;
        }
        // 取第一个选中的视频播放
        const firstVideoId = selectedVideos[0];
        const video = videoLibrary.find(v => v.id === firstVideoId);
        if (video) {
            if (video.isVip) {
                callParseVideoFunction(video.url, 'vip').then(result => {
                    openVipPlayerModal(result, video.url);
                });
            } else {
                openNormalPlayerModal(video);
            }
        }
    });

    // 批量删除
    batchDeleteBtn.addEventListener('click', () => {
        if (selectedVideos.length === 0) {
            alert('请先选择要删除的视频！');
            return;
        }
        if (confirm(`确定要删除选中的 ${selectedVideos.length} 个视频吗？删除后无法恢复！`)) {
            // 过滤掉选中的视频
            videoLibrary = videoLibrary.filter(v => !selectedVideos.includes(v.id));
            // 保存到本地存储
            localStorage.setItem('videoLibrary', JSON.stringify(videoLibrary));
            // 重置选中列表
            selectedVideos = [];
            // 隐藏批量操作工具栏
            document.getElementById('batch-toolbar').classList.add('hidden');
            // 重新渲染
            renderVideoLibrary();
            alert('视频删除成功！');
        }
    });

    // 取消批量选择
    batchCancelBtn.addEventListener('click', () => {
        selectedVideos = [];
        updateBatchToolbar();
        // 隐藏批量操作工具栏
        document.getElementById('batch-toolbar').classList.add('hidden');
        // 重新渲染
        renderVideoLibrary();
    });
}

// --- 核心工具函数 ---
// 验证URL是否有效
function isValidUrl(url) {
    try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
    } catch (e) {
        return false;
    }
}

// 从URL中提取平台信息
function getPlatformFromUrl(url) {
    if (!url) return 'unknown';
    if (url.includes('bilibili') || url.includes('bilibili.com')) return 'bilibili';
    if (url.includes('iqiyi') || url.includes('iqiyi.com')) return 'iqiyi';
    if (url.includes('v.qq.com') || url.includes('qq.com')) return 'tencent';
    if (url.includes('youku') || url.includes('youku.com')) return 'youku';
    if (url.includes('youtube') || url.includes('youtube.com')) return 'youtube';
    if (url.includes('mgtv') || url.includes('mgtv.com')) return 'mgtv';
    if (url.includes('sohu') || url.includes('sohu.com')) return 'sohu';
    return 'unknown';
}

// 检测视频是否为VIP（调用Netlify Serverless函数）
async function detectVipStatus(url) {
    try {
        const response = await fetch('/.netlify/functions/detect-vip', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });

        const data = await response.json();
        return data.isVip || false;
    } catch (error) {
        console.error('检测VIP状态失败：', error);
        return false;
    }
}

// 调用解析视频的Serverless函数
async function callParseVideoFunction(url, parserType = 'vip', parserLine = 'parser1') {
    try {
        const response = await fetch('/.netlify/functions/parse-video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url, parserType, parserLine })
        });

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || '解析失败');
        }

        // 保存最后一次解析结果
        localStorage.setItem('lastParseResult', JSON.stringify(data.result));
        return data.result;
    } catch (error) {
        console.error('调用解析函数失败：', error);
        throw error;
    }
}

// 更新批量操作工具栏
function updateBatchToolbar() {
    const batchCount = document.getElementById('batch-selected-count');
    batchCount.textContent = `已选择 ${selectedVideos.length} 个视频`;
}

// 渲染视频库
function renderVideoLibrary(filteredVideos = null) {
    const videosToRender = filteredVideos || videoLibrary;
    const videoListContainer = document.getElementById('video-list');
    const videoTableBody = document.getElementById('video-table-body');
    const emptyState = document.getElementById('empty-video-state');

    // 显示空状态
    if (videosToRender.length === 0) {
        emptyState.classList.remove('hidden');
        videoListContainer.innerHTML = '';
        videoTableBody.innerHTML = '';
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    // 渲染网格视图
    videoListContainer.innerHTML = '';
    videosToRender.forEach(video => {
        const videoCard = document.createElement('div');
        videoCard.className = 'video-card';
        videoCard.dataset.id = video.id;

        // 构建平台标签
        const platformTag = `<span class="platform-tag platform-${video.platform}">${getPlatformName(video.platform)}</span>`;

        // 构建VIP标签
        const vipBadge = video.isVip ? '<div class="vip-badge"><i class="fa fa-diamond mr-1"></i>VIP</div>' : '';

        // 构建复选框（批量选择模式下显示）
        const checkbox = document.getElementById('batch-toolbar').classList.contains('hidden') 
            ? '' 
            : `<input type="checkbox" class="video-select-checkbox" data-id="${video.id}" ${selectedVideos.includes(video.id) ? 'checked' : ''}>`;

        videoCard.innerHTML = `
            ${vipBadge}
            <div class="video-preview-card aspect-video bg-gray-700">
                <div class="flex items-center justify-center h-full">
                    <i class="fa fa-film text-4xl text-gray-500"></i>
                </div>
                <div class="preview-overlay">
                    <h3 class="font-bold mb-2">${video.title}</h3>
                    <div class="tag-group mb-3">${platformTag}</div>
                    <div class="btn-group">
                        <button class="play-video-btn btn-3d bg-blue-600 hover:bg-blue-700 text-sm" data-id="${video.id}">
                            <i class="fa fa-play mr-1"></i>播放
                        </button>
                        <button class="edit-video-btn btn-3d bg-gray-700 hover:bg-gray-600 text-sm" data-id="${video.id}">
                            <i class="fa fa-edit mr-1"></i>编辑
                        </button>
                    </div>
                </div>
            </div>
            <div class="p-4">
                <div class="flex justify-between items-center mb-2">
                    ${checkbox}
                    <span class="text-xs text-gray-400">${video.addTime}</span>
                </div>
                <p class="text-sm text-gray-400 truncate">${video.description || '无描述'}</p>
            </div>
        `;

        videoListContainer.appendChild(videoCard);

        // 绑定播放按钮事件
        videoCard.querySelector('.play-video-btn').addEventListener('click', () => {
            if (video.isVip) {
                callParseVideoFunction(video.url, 'vip').then(result => {
                    openVipPlayerModal(result, video.url);
                });
            } else {
                openNormalPlayerModal(video);
            }
        });

        // 绑定编辑按钮事件
        videoCard.querySelector('.edit-video-btn').addEventListener('click', () => {
            openEditVideoModal(video);
        });

        // 绑定复选框事件
        const checkboxEl = videoCard.querySelector('.video-select-checkbox');
        if (checkboxEl) {
            checkboxEl.addEventListener('change', (e) => {
                const videoId = e.target.dataset.id;
                if (e.target.checked) {
                    if (!selectedVideos.includes(videoId)) {
                        selectedVideos.push(videoId);
                    }
                } else {
                    selectedVideos = selectedVideos.filter(id => id !== videoId);
                }
                updateBatchToolbar();
            });
        }
    });

    // 渲染表格视图
    videoTableBody.innerHTML = '';
    videosToRender.forEach(video => {
        const tr = document.createElement('tr');
        tr.dataset.id = video.id;

        tr.innerHTML = `
            <td><input type="checkbox" class="video-select-checkbox" data-id="${video.id}" ${selectedVideos.includes(video.id) ? 'checked' : ''}></td>
            <td class="font-medium">${video.title}</td>
            <td><span class="platform-tag platform-${video.platform}">${getPlatformName(video.platform)}</span></td>
            <td>${getCategoryName(video.category)}</td>
            <td>${video.isVip ? '<span class="text-purple-400"><i class="fa fa-lock mr-1"></i>VIP</span>' : '<span class="text-green-400"><i class="fa fa-unlock mr-1"></i>免费</span>'}</td>
            <td class="text-sm text-gray-400">${video.addTime}</td>
            <td class="btn-group">
                <button class="play-video-btn btn-3d bg-blue-600 hover:bg-blue-700 text-xs" data-id="${video.id}">
                    <i class="fa fa-play mr-1"></i>播放
                </button>
                <button class="edit-video-btn btn-3d bg-gray-700 hover:bg-gray-600 text-xs" data-id="${video.id}">
                    <i class="fa fa-edit mr-1"></i>编辑
                </button>
            </td>
        `;

        videoTableBody.appendChild(tr);

        // 绑定播放按钮事件
        tr.querySelector('.play-video-btn').addEventListener('click', () => {
            if (video.isVip) {
                callParseVideoFunction(video.url, 'vip').then(result => {
                    openVipPlayerModal(result, video.url);
                });
            } else {
                openNormalPlayerModal(video);
            }
        });

        // 绑定编辑按钮事件
        tr.querySelector('.edit-video-btn').addEventListener('click', () => {
            openEditVideoModal(video);
        });

        // 绑定复选框事件
        const checkboxEl = tr.querySelector('.video-select-checkbox');
        checkboxEl.addEventListener('change', (e) => {
            const videoId = e.target.dataset.id;
            if (e.target.checked) {
                if (!selectedVideos.includes(videoId)) {
                    selectedVideos.push(videoId);
                }
            } else {
                selectedVideos = selectedVideos.filter(id => id !== videoId);
            }
            updateBatchToolbar();
        });
    });
}

// 打开普通视频播放模态框
function openNormalPlayerModal(video) {
    const modal = document.getElementById('video-player-modal');
    const fullscreenVideo = document.getElementById('fullscreen-video');
    const videoTitle = document.getElementById('fullscreen-video-title');
    const videoDescription = document.getElementById('fullscreen-video-description');
    const originalLinkBtn = document.getElementById('original-link-btn');

    // 填充数据
    fullscreenVideo.src = video.url;
    videoTitle.textContent = video.title;
    videoDescription.textContent = video.description || '无描述';
    originalLinkBtn.href = video.url;

    // 显示模态框
    modal.classList.remove('hidden');
}

// 打开VIP视频播放模态框
function openVipPlayerModal(parseResult, originalUrl) {
    const modal = document.getElementById('vip-player-modal');
    const vipVideoPlayer = document.getElementById('vip-video-player');
    const vipVideoTitle = document.getElementById('vip-video-title');
    const vipOriginalLink = document.getElementById('vip-original-link');
    const videoSize = document.getElementById('video-size');

    // 填充数据
    vipVideoPlayer.src = parseResult.playUrl;
    vipVideoTitle.textContent = parseResult.title || 'VIP视频播放';
    vipOriginalLink.href = originalUrl;
    videoSize.textContent = parseResult.fileSize || '未知';

    // 显示模态框（隐藏错误，显示加载）
    document.getElementById('vip-player-error').classList.add('hidden');
    document.getElementById('vip-player-loading').classList.remove('hidden');
    modal.classList.remove('hidden');

    // 视频加载完成后隐藏加载
    vipVideoPlayer.onload = () => {
        document.getElementById('vip-player-loading').classList.add('hidden');
    };

    // 视频加载失败显示错误
    vipVideoPlayer.onerror = () => {
        document.getElementById('vip-player-loading').classList.add('hidden');
        document.getElementById('vip-player-error').classList.remove('hidden');
    };
}

// 打开编辑视频模态框
function openEditVideoModal(video) {
    const modal = document.getElementById('edit-video-modal');
    document.getElementById('edit-video-id').value = video.id;
    document.getElementById('edit-video-title').value = video.title;
    document.getElementById('edit-video-url').value = video.url;
    document.getElementById('edit-video-category').value = video.category;
    document.getElementById('edit-video-description').value = video.description || '';
    document.getElementById('edit-video-is-vip').checked = video.isVip;

    // 保存当前编辑ID
    currentEditVideoId = video.id;

    // 显示模态框
    modal.classList.remove('hidden');
}

// 渲染解析结果
function renderParseResult(parseResult) {
    const resultList = document.getElementById('parse-result-list');
    resultList.innerHTML = '';

    const resultItem = document.createElement('div');
    resultItem.className = 'parse-result-item';
    resultItem.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <h5 class="font-bold">${parseResult.title || '解析成功'}</h5>
            <span class="text-sm text-gray-400">${parseResult.fileSize || '未知大小'}</span>
        </div>
        <div class="mb-3">
            <span class="text-sm text-gray-400">支持画质：</span>
            <span class="text-sm">1080P / 720P / 480P / 360P</span>
        </div>
        <div class="btn-group">
            <button class="btn-3d bg-blue-600 hover:bg-blue-700 text-sm play-parse-result" data-url="${parseResult.playUrl}">
                <i class="fa fa-play mr-1"></i>立即播放
            </button>
            <a href="${parseResult.downloadUrl || parseResult.playUrl}" target="_blank" class="btn-3d bg-green-600 hover:bg-green-700 text-sm">
                <i class="fa fa-download mr-1"></i>下载视频
            </a>
        </div>
    `;

    resultList.appendChild(resultItem);

    // 绑定立即播放按钮事件
    resultItem.querySelector('.play-parse-result').addEventListener('click', (e) => {
        const playUrl = e.target.dataset.url || e.currentTarget.dataset.url;
        const modal = document.getElementById('vip-player-modal');
        const vipVideoPlayer = document.getElementById('vip-video-player');

        // 填充数据
        vipVideoPlayer.src = playUrl;
        document.getElementById('vip-video-title').textContent = parseResult.title || 'VIP视频播放';
        document.getElementById('video-size').textContent = parseResult.fileSize || '未知';

        // 显示模态框
        document.getElementById('vip-player-loading').classList.remove('hidden');
        document.getElementById('vip-player-error').classList.add('hidden');
        modal.classList.remove('hidden');
    });
}

// 辅助函数：显示解析错误
function showParseError(message) {
    const parseError = document.getElementById('parse-error');
    const parseErrorText = document.getElementById('parse-error-text');
    parseErrorText.textContent = message;
    parseError.classList.remove('hidden');
}

// 辅助函数：隐藏解析错误
function hideParseError() {
    const parseError = document.getElementById('parse-error');
    parseError.classList.add('hidden');
}

// 辅助函数：显示解析结果
function showParseResult() {
    const parseResult = document.getElementById('parse-result');
    parseResult.classList.remove('hidden');
}

// 辅助函数：隐藏解析结果
function hideParseResult() {
    const parseResult = document.getElementById('parse-result');
    parseResult.classList.add('hidden');
}

// 辅助函数：获取平台名称
function getPlatformName(platform) {
    const platformMap = {
        'bilibili': 'B站',
        'iqiyi': '爱奇艺',
        'tencent': '腾讯视频',
        'youku': '优酷',
        'youtube': 'YouTube',
        'mgtv': '芒果TV',
        'sohu': '搜狐视频',
        'unknown': '未知平台'
    };
    return platformMap[platform] || platformMap['unknown'];
}

// 辅助函数：获取分类名称
function getCategoryName(category) {
    const categoryMap = {
        'education': '教育',
        'entertainment': '娱乐',
        'technology': '科技',
        'music': '音乐',
        'sports': '体育',
        'vip': 'VIP视频',
        'movie': '电影',
        'tv': '电视剧',
        'anime': '动漫',
        'documentary': '纪录片'
    };
    return categoryMap[category] || category;
}
