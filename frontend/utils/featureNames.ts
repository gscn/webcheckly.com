/**
 * 功能名称和分类的国际化映射
 */

export function getFeatureName(featureCode: string, locale: string): string {
  const featureNames: Record<string, { zh: string; en: string }> = {
    'link-health': { zh: '页面链接检查', en: 'Page Link Check' },
    'website-info': { zh: '网站信息', en: 'Website Information' },
    'domain-info': { zh: '域名信息', en: 'Domain Information' },
    'ssl-info': { zh: 'SSL证书', en: 'SSL Certificate' },
    'tech-stack': { zh: '技术栈', en: 'Technology Stack' },
    'performance': { zh: '性能检测', en: 'Performance Monitoring' },
    'seo': { zh: 'SEO检测', en: 'SEO Monitoring' },
    'security': { zh: '安全检测', en: 'Security Monitoring' },
    'accessibility': { zh: '可访问性', en: 'Accessibility' },
    'ai-analysis': { zh: 'AI分析', en: 'AI Analysis' },
    'deep-scan': { zh: '全站链接检查', en: 'Full Site Link Check' },
  };

  const feature = featureNames[featureCode];
  if (!feature) {
    return featureCode; // 如果找不到映射，返回原始代码
  }

  return locale === 'en' ? feature.en : feature.zh;
}

export function getCategoryName(category: string, locale: string): string {
  const categoryNames: Record<string, { zh: string; en: string }> = {
    'basic': { zh: '基础功能', en: 'Basic' },
    'premium': { zh: '高级功能', en: 'Premium' },
  };

  const categoryName = categoryNames[category.toLowerCase()];
  if (!categoryName) {
    return category;
  }

  return locale === 'en' ? categoryName.en : categoryName.zh;
}
