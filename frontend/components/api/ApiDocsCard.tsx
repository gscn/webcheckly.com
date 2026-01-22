'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ApiDocsCard() {
  const { t } = useLanguage();
  const [copied, setCopied] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const codeExamples = [
    {
      title: t('api.docs.example.curl'),
      code: `curl -X POST ${API_BASE_URL}/api/scans \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "options": ["website-info", "domain-info"],
    "language": "zh"
  }'`,
      key: 'curl',
    },
    {
      title: t('api.docs.example.javascript'),
      code: `const response = await fetch('${API_BASE_URL}/api/scans', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com',
    options: ['website-info', 'domain-info'],
    language: 'zh'
  })
});

const data = await response.json();
console.log('Task ID:', data.id);`,
      key: 'javascript',
    },
    {
      title: t('api.docs.example.python'),
      code: `import requests

headers = {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'application/json'
}

data = {
    'url': 'https://example.com',
    'options': ['website-info', 'domain-info'],
    'language': 'zh'
}

response = requests.post(
    '${API_BASE_URL}/api/scans',
    headers=headers,
    json=data
)

task = response.json()
print('Task ID:', task['id'])`,
      key: 'python',
    },
  ];

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-tech-cyan/30 to-tech-blue/30 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
      <div className="relative bg-tech-bg/80 backdrop-blur-xl border border-tech-border/40 clip-tech-panel">
        {/* Decorative Corner Markers */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-tech-cyan/50"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-tech-cyan/50"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-tech-cyan/50"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-tech-cyan/50"></div>

        <div className="p-6 relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 bg-tech-cyan rounded-full shadow-neon-cyan animate-pulse"></span>
            <h2 className="text-xl font-bold text-tech-cyan font-mono uppercase tracking-wider">
              {t('api.docs.title')}
            </h2>
          </div>

          <div className="space-y-6">
            {/* 认证说明 */}
            <div>
              <h3 className="text-tech-cyan font-mono text-sm font-bold mb-2">
                {t('api.docs.authentication')}
              </h3>
              <p className="text-gray-300 font-mono text-sm mb-2">
                {t('api.docs.authDescription')}
              </p>
              <p className="text-tech-cyan/90 font-mono text-xs mb-2">
                {t('api.docs.tokenHint')}
              </p>
              <div className="bg-tech-surface/50 border border-tech-border/30 rounded p-3 font-mono text-xs text-gray-300">
                Authorization: Bearer YOUR_ACCESS_TOKEN
              </div>
            </div>

            {/* 基础URL */}
            <div>
              <h3 className="text-tech-cyan font-mono text-sm font-bold mb-2">
                {t('api.docs.baseUrl')}
              </h3>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-tech-surface/50 border border-tech-border/30 rounded p-3 font-mono text-xs text-gray-300">
                  {API_BASE_URL}
                </div>
                <button
                  onClick={() => copyToClipboard(API_BASE_URL, 'baseUrl')}
                  className="clip-tech-btn bg-tech-cyan/10 hover:bg-tech-cyan/20 border border-tech-cyan/60 hover:border-tech-cyan text-tech-cyan font-mono text-xs font-bold px-3 py-2 transition-all"
                >
                  {copied === 'baseUrl' ? t('common.copied') : t('common.copy')}
                </button>
              </div>
            </div>

            {/* 代码示例 */}
            <div>
              <h3 className="text-tech-cyan font-mono text-sm font-bold mb-4">
                {t('api.docs.examples')}
              </h3>
              <div className="space-y-4">
                {codeExamples.map((example) => (
                  <div key={example.key}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-tech-cyan/70 font-mono text-xs uppercase">
                        {example.title}
                      </span>
                      <button
                        onClick={() => copyToClipboard(example.code, example.key)}
                        className="text-tech-cyan hover:text-[#33f2ff] font-mono text-xs transition-colors"
                      >
                        {copied === example.key ? t('common.copied') : t('common.copy')}
                      </button>
                    </div>
                    <pre className="bg-tech-surface/50 border border-tech-border/30 rounded p-3 overflow-x-auto">
                      <code className="text-gray-300 font-mono text-xs">{example.code}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            {/* 更多信息 */}
            <div className="pt-4 border-t border-tech-border/30">
              <p className="text-gray-400 font-mono text-xs">
                {t('api.docs.moreInfo')}{' '}
                <a
                  href={`${API_BASE_URL}/swagger/index.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tech-cyan hover:text-[#33f2ff] underline"
                >
                  {t('api.docs.swaggerDocs')}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
