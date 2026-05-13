export async function generateWithBaidu(_imageBuffer: Buffer, style = 'cartoon') {
  const prompt = `将猫咪照片转换为可爱的 Q 版 3D 卡通头像，风格：${style}`;
  const apiKey = process.env.BAIDU_API_KEY;
  const secretKey = process.env.BAIDU_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error('百度 API 密钥未配置');
  }

  const tokenResponse = await fetch(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`,
  );
  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    throw new Error('获取百度访问令牌失败');
  }

  const response = await fetch(
    `https://aip.baidubce.com/rpc/2.0/ai/v1/txt2img?access_token=${tokenData.access_token}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        width: 512,
        height: 512,
        image_num: 1,
        style: '卡通风格',
      }),
    },
  );

  const result = await response.json();

  if (result.error_code) {
    throw new Error(`百度 API 错误: ${result.error_msg}`);
  }

  const imageUrl = result.data?.sub_task_result_list?.[0]?.final_image_list?.[0]?.img_url;
  if (!imageUrl) {
    throw new Error('百度 API 返回数据格式错误');
  }

  const imageResponse = await fetch(imageUrl);
  const arrayBuffer = await imageResponse.arrayBuffer();

  return new Blob([arrayBuffer], { type: 'image/png' });
}

export async function generateWithAliyun(_imageBuffer: Buffer, style = 'cartoon') {
  void style;
  throw new Error('阿里云服务待实现');
}
