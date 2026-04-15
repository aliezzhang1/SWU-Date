export type SensitiveCategory = 'abuse' | 'sexual' | 'spam' | 'fraud';

export interface SensitiveWordGroup {
  label: string;
  reason: string;
  keywords: string[];
}

export const SENSITIVE_WORD_GROUPS: Record<SensitiveCategory, SensitiveWordGroup> = {
  abuse: {
    label: '侮辱性语言',
    reason: '消息包含脏话或侮辱性语言，暂时无法发送。',
    keywords: [
      '傻逼',
      '煞笔',
      '沙比',
      '脑残',
      '智障',
      '低能',
      '废物',
      '滚开',
      '滚远点',
      '死全家',
      '恶心死了',
    ],
  },
  sexual: {
    label: '色情低俗内容',
    reason: '消息包含色情或低俗内容，暂时无法发送。',
    keywords: [
      '约炮',
      '裸聊',
      '开房',
      '一夜情',
      '做爱',
      '上床',
      '啪',
      '约吗',
      '成人视频',
      '色色',
      '性服务',
    ],
  },
  spam: {
    label: '广告或联系方式引流',
    reason: '消息包含广告、引流或联系方式交换内容，暂时无法发送。',
    keywords: [
      '加微信',
      '留微信',
      '发微信',
      '互换微信',
      '加weixin',
      '留weixin',
      '加vx',
      '留vx',
      '加qq',
      '留qq',
      '加扣扣',
      '转账',
      '优惠券',
      '优惠',
      '代购',
      '代理',
      '推广',
      '加群',
    ],
  },
  fraud: {
    label: '诈骗风险词',
    reason: '消息包含高风险诈骗相关内容，暂时无法发送。',
    keywords: [
      '刷单',
      '兼职日结',
      '日结',
      '贷款',
      '裸贷',
      '征信修复',
      '做任务赚钱',
      '兼职返现',
      '低息贷款',
      '杀猪盘',
    ],
  },
};

export const WARNING_PATTERNS = {
  phone: /(?<!\d)1[3-9]\d{9}(?!\d)/g,
};
