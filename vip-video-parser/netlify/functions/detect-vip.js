// 检测视频是否为VIP的Netlify Serverless函数
exports.handler = async (event, context) => {
    // 只允许POST请求
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ success: false, message: '只支持POST请求' })
        };
    }

    try {
        // 解析请求体
        const { url } = JSON.parse(event.body);
        if (!url || !url.startsWith('http')) {
            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, message: '无效的视频链接' })
            };
        }

        // 真实VIP检测逻辑（基于URL关键字匹配，可扩展）
        const vipDomains = [
            'iqiyi.com/v_',
            'v.qq.com/x/cover/',
            'youku.com/v_show/id_',
            'mgtv.com/b/''
        ];

        const vipKeywords = ['vip', 'pay', 'member', '收费', '会员'];
        const isVipDomain = vipDomains.some(domain => url.includes(domain));
        const isVipKeyword = vipKeywords.some(keyword => url.toLowerCase().includes(keyword));
        const isVip = isVipDomain || isVipKeyword;

        // 返回结果
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                isVip
            })
        };
    } catch (error) {
        console.error('检测VIP失败：', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: '服务器内部错误' })
        };
    }
};
