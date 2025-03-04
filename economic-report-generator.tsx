import React, { useState, useEffect, useRef } from 'react';

// 타입 정의
interface NewsItem {
  text: string;
  highlight: boolean;
}

interface Subsection {
  title: string;
  content: NewsItem[];
}

interface Section {
  title: string;
  subsections: Subsection[];
}

interface WeekData {
  title: string;
  quote: string;
  sections: Section[];
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

interface NewsCardProps {
  title: string;
  content: React.ReactNode;
  highlight?: boolean;
}

interface NewsItemProps {
  children: React.ReactNode;
  highlight?: boolean;
}

const EconomicReportGenerator: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [parsedData, setParsedData] = useState<WeekData[]>([]);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [shareURL, setShareURL] = useState<string>('');
  const [loadingPercent, setLoadingPercent] = useState<number>(0);
  const reportRef = useRef<HTMLDivElement>(null);
  
  // 페이지 로드 시 URL 파라미터 확인
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedText = urlParams.get('data');
    if (encodedText) {
      try {
        const decodedText = decodeURIComponent(atob(encodedText));
        setInputText(decodedText);
        parseText(decodedText);
      } catch (e) {
        console.error("Error parsing shared URL:", e);
      }
    }
  }, []);

  // 텍스트 파싱 함수
  const parseText = (text: string): void => {
    setLoading(true);
    setLoadingPercent(10);
    
    // 파싱 과정을 비동기로 처리하여 UI 차단 방지
    setTimeout(() => {
      try {
        // 결과 저장할 배열
        const parsedWeeks: WeekData[] = [];
        setLoadingPercent(20);
        
        // 주차별로 텍스트 분리 (♧로 시작하는 부분)
        const weekTexts = text.split(/♧\s*[\d\.]+\s*[月火水木金土日]\s*News\s*&\s*Trends\s*♧/).filter(item => item.trim());
        setLoadingPercent(30);
        
        // 주차 제목 추출
        const weekTitles: string[] = [];
        const titleRegex = /♧\s*([\d\.]+\s*[月火水木金土日])\s*News\s*&\s*Trends\s*♧/g;
        let match: RegExpExecArray | null;
        while ((match = titleRegex.exec(text)) !== null) {
          weekTitles.push(match[1].trim());
        }
        setLoadingPercent(40);
        
        // 각 주차별 컨텐츠 파싱
        weekTexts.forEach((weekText, idx) => {
          const weekData: WeekData = {
            title: weekTitles[idx] || `Week ${idx + 1}`,
            quote: "",
            sections: []
          };
          
          // 인용구 찾기 (따옴표 사이의 텍스트)
          const quoteMatch = weekText.match(/"([^"]+)"/);
          if (quoteMatch) {
            weekData.quote = quoteMatch[1].trim();
          }
          
          // 섹션 나누기 (로마 숫자로 시작하는 섹션)
          const sectionTexts = weekText.split(/\s*Ⅰ\s*\.|\s*Ⅱ\s*\.|\s*Ⅲ\s*\.|\s*Ⅳ\s*\.|\s*Ⅴ\s*\.|\s*Ⅵ\s*\./).filter(item => item.trim());
          
          // 섹션 제목 추출
          const sectionTitles: string[] = [];
          const sectionTitleRegex = /\s*(Ⅰ|Ⅱ|Ⅲ|Ⅳ|Ⅴ|Ⅵ)\s*\.\s*([^\n]+)/g;
          let sectionMatch: RegExpExecArray | null;
          while ((sectionMatch = sectionTitleRegex.exec(weekText)) !== null) {
            sectionTitles.push(sectionMatch[2].trim());
          }
          
          // 각 섹션 파싱
          sectionTexts.forEach((sectionText, sIdx) => {
            if (sIdx === 0 && !sectionTitles.length) return; // 첫 부분이 섹션이 아닌 경우 스킵
            
            const sectionData: Section = {
              title: sectionTitles[sIdx - 1] || `Section ${sIdx}`,
              subsections: []
            };
            
            // 하위 섹션 파싱 (1., 2. 등으로 시작하거나 ▶, ◇ 등의 특수문자로 시작)
            const subsectionRegex = /(?:\d+\.|▶|◇|■)[^\n]+(?:\n(?!(?:\d+\.|▶|◇|■))[^\n]+)*/g;
            let subsectionMatch: RegExpExecArray | null;
            const subsectionTexts: string[] = [];
            
            while ((subsectionMatch = subsectionRegex.exec(sectionText)) !== null) {
              subsectionTexts.push(subsectionMatch[0].trim());
            }
            
            if (subsectionTexts.length === 0) {
              // 특별한 구분자가 없는 경우, 텍스트 전체를 하나의 하위 섹션으로 처리
              const lines = sectionText.split('\n').filter(line => line.trim());
              if (lines.length > 0) {
                const title = lines[0].trim();
                const content = lines.slice(1).join('\n');
                
                sectionData.subsections.push({
                  title: title,
                  content: parseNewsItems(content)
                });
              }
            } else {
              subsectionTexts.forEach(subsectionText => {
                const lines = subsectionText.split('\n').filter(line => line.trim());
                if (lines.length > 0) {
                  const title = lines[0].trim();
                  const content = lines.slice(1).join('\n');
                  
                  sectionData.subsections.push({
                    title: title,
                    content: parseNewsItems(content)
                  });
                }
              });
            }
            
            weekData.sections.push(sectionData);
          });
          
          parsedWeeks.push(weekData);
        });
        
        setLoadingPercent(80);
        setParsedData(parsedWeeks);
        
        // 공유 URL 생성
        generateShareURL(text);
        setLoadingPercent(100);
        setLoading(false);
      } catch (error) {
        console.error("Error parsing text:", error);
        setLoading(false);
      }
    }, 100);
  };
  
  // 뉴스 항목 파싱
  const parseNewsItems = (text: string): NewsItem[] => {
    if (!text) return [];
    
    const items: NewsItem[] = [];
    const lines = text.split('\n');
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      
      // 중요 항목 (📍 또는 ✔ 또는 highlight 등의 표시가 있는 항목)
      const isHighlight = /📍|✔|highlight|▪️|중요|대폭|급등|급락|사상|최대|최고/.test(trimmedLine);
      
      items.push({
        text: trimmedLine.replace(/^[ㆍ•·-]\s*/, ''), // 불릿 포인트 제거
        highlight: isHighlight
      });
    });
    
    return items;
  };
  
  // 공유 URL 생성
  const generateShareURL = (text: string): void => {
    const encodedText = btoa(encodeURIComponent(text));
    const url = `${window.location.origin}${window.location.pathname}?data=${encodedText}`;
    setShareURL(url);
  };
  
  // 클립보드에 공유 URL 복사
  const copyShareURL = (): void => {
    navigator.clipboard.writeText(shareURL).then(() => {
      showToast('공유 URL이 클립보드에 복사되었습니다!');
    }).catch(err => {
      console.error('Error copying to clipboard:', err);
      showToast('클립보드 복사에 실패했습니다.', 'error');
    });
  };

  // 토스트 메시지 표시
  const [toast, setToast] = useState<{message: string, visible: boolean, type: 'success' | 'error'}>({
    message: '',
    visible: false,
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success'): void => {
    setToast({ message, visible: true, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };
  
  // PNG 다운로드
  const handleDownload = async (): Promise<void> => {
    if (!reportRef.current) return;
    
    try {
      setLoading(true);
      showToast('이미지를 생성 중입니다... 잠시만 기다려주세요.');
      
      // @ts-ignore - CDN 외부 모듈 로드
      const { default: html2canvas } = await import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.esm.js');
      
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      
      const link = document.createElement('a');
      link.download = `economic-report-${parsedData[activeTab]?.title || 'default'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      setLoading(false);
      showToast('리포트가 PNG 이미지로 다운로드되었습니다!');
    } catch (error) {
      console.error('Error generating image:', error);
      setLoading(false);
      showToast('이미지 생성 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    }
  };
  
  // 주요 섹션 컴포넌트
  const Section: React.FC<SectionProps> = ({ title, children }) => (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4 text-indigo-800 border-b border-indigo-100 pb-2">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );

  // 뉴스 카드 컴포넌트
  const NewsCard: React.FC<NewsCardProps> = ({ title, content, highlight = false }) => (
    <div className={`p-4 mb-4 rounded-xl shadow-sm transition-all hover:shadow-md ${
      highlight 
        ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-400' 
        : 'bg-white hover:bg-gray-50'
    }`}>
      {title && (
        <h3 className={`font-bold text-lg mb-3 ${
          highlight ? 'text-amber-800' : 'text-gray-800'
        }`}>
          {title}
        </h3>
      )}
      <div className="text-sm space-y-1">{content}</div>
    </div>
  );

  // 작은 뉴스 아이템 컴포넌트
  const NewsItem: React.FC<NewsItemProps> = ({ children, highlight = false }) => (
    <div className={`py-1.5 flex items-start ${
      highlight ? 'font-medium text-red-700' : 'text-gray-700'
    }`}>
      <span className="mr-2 mt-0.5 flex-shrink-0">
        {highlight ? '📍' : 'ㆍ'}
      </span>
      <span className="flex-1">{children}</span>
    </div>
  );
  
  // 제출 핸들러
  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (inputText.trim()) {
      parseText(inputText);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-4 bg-gray-50 min-h-screen">
      <header className="text-center py-4 sm:py-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-indigo-900">경제 리포트 생성기</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">경제 뉴스 텍스트를 붙여넣고 깔끔한 형식의 리포트를 생성하세요</p>
      </header>
      
      <div className="mb-6 bg-white rounded-xl shadow-sm p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-4">
            <label htmlFor="reportText" className="block text-sm font-medium text-gray-700 mb-2">
              경제 뉴스 텍스트 붙여넣기
            </label>
            <textarea
              id="reportText"
              className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 transition"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="경제 리포트 텍스트를 여기에 붙여넣으세요 (♧ 2.3 月 News & Trends ♧ 형식으로 시작)"
            ></textarea>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-5 rounded-lg transition shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  처리 중...
                </>
              ) : '리포트 생성하기'}
            </button>
            {parsedData.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={copyShareURL}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-5 rounded-lg transition shadow-sm hover:shadow-md flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  공유 URL 복사
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-5 rounded-lg transition shadow-sm hover:shadow-md flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  PNG로 다운로드
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
      
      {/* 로딩 프로그레스 바 */}
      {loading && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
          <div 
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${loadingPercent}%` }}
          ></div>
        </div>
      )}
      
      {/* 토스트 알림 */}
      <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg transition-opacity duration-300 ${
        toast.visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      } ${
        toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
      }`}>
        {toast.message}
      </div>
      
      {parsedData.length > 0 && (
        <div ref={reportRef} className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 sm:p-6">
            {/* 커스텀 탭 네비게이션 */}
            <div className="flex border-b mb-6 overflow-x-auto scrollbar-hide">
              {parsedData.map((week, index) => (
                <button
                  key={index}
                  className={`px-4 py-3 text-center whitespace-nowrap cursor-pointer focus:outline-none transition-all ${
                    activeTab === index 
                      ? 'border-b-2 border-indigo-500 font-medium text-indigo-800' 
                      : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-50'
                  }`}
                  onClick={() => setActiveTab(index)}
                >
                  {week.title}
                </button>
              ))}
            </div>
            
            {/* 탭 콘텐츠 */}
            {parsedData[activeTab] && (
              <div className="p-1 sm:p-2">
                <div className="text-center mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
                    ♧ {parsedData[activeTab].title} News & Trends ♧
                  </h2>
                  {parsedData[activeTab].quote && (
                    <p className="italic text-gray-600 mt-4 text-sm sm:text-base px-4 py-3 border-l-4 border-indigo-100 bg-indigo-50 rounded-r-lg">
                      "{parsedData[activeTab].quote}"
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div>
                    {parsedData[activeTab].sections.slice(0, Math.ceil(parsedData[activeTab].sections.length / 2)).map((section, idx) => (
                      <Section key={idx} title={section.title}>
                        {section.subsections.map((subsection, subIdx) => (
                          <NewsCard
                            key={subIdx}
                            title={subsection.title}
                            highlight={/Sizzling|중요|주목|Watch/i.test(subsection.title)}
                            content={
                              <div>
                                {subsection.content.map((item, itemIdx) => (
                                  <NewsItem key={itemIdx} highlight={item.highlight}>
                                    {item.text}
                                  </NewsItem>
                                ))}
                              </div>
                            }
                          />
                        ))}
                      </Section>
                    ))}
                  </div>
                  
                  <div>
                    {parsedData[activeTab].sections.slice(Math.ceil(parsedData[activeTab].sections.length / 2)).map((section, idx) => (
                      <Section key={idx} title={section.title}>
                        {section.subsections.map((subsection, subIdx) => (
                          <NewsCard
                            key={subIdx}
                            title={subsection.title}
                            highlight={/Sizzling|중요|주목|Watch/i.test(subsection.title)}
                            content={
                              <div>
                                {subsection.content.map((item, itemIdx) => (
                                  <NewsItem key={itemIdx} highlight={item.highlight}>
                                    {item.text}
                                  </NewsItem>
                                ))}
                              </div>
                            }
                          />
                        ))}
                      </Section>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <footer className="text-center text-gray-500 text-sm mt-6 pb-6 px-4">
            © 2025 Economic News & Trends Report
          </footer>
        </div>
      )}
    </div>
  );
};

export default EconomicReportGenerator;