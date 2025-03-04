import React, { useState, useEffect, useRef } from 'react';

const EconomicReportGenerator = () => {
  const [inputText, setInputText] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [shareURL, setShareURL] = useState('');
  const reportRef = useRef(null);
  
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
  const parseText = (text) => {
    setLoading(true);
    
    // 결과 저장할 배열
    const parsedWeeks = [];
    
    // 주차별로 텍스트 분리 (♧로 시작하는 부분)
    const weekTexts = text.split(/♧\s*[\d\.]+\s*[月火水木金土日]\s*News\s*&\s*Trends\s*♧/).filter(item => item.trim());
    
    // 주차 제목 추출
    const weekTitles = [];
    const titleRegex = /♧\s*([\d\.]+\s*[月火水木金土日])\s*News\s*&\s*Trends\s*♧/g;
    let match;
    while ((match = titleRegex.exec(text)) !== null) {
      weekTitles.push(match[1].trim());
    }
    
    // 각 주차별 컨텐츠 파싱
    weekTexts.forEach((weekText, idx) => {
      const weekData = {
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
      const sectionTitles = [];
      const sectionTitleRegex = /\s*(Ⅰ|Ⅱ|Ⅲ|Ⅳ|Ⅴ|Ⅵ)\s*\.\s*([^\n]+)/g;
      let sectionMatch;
      while ((sectionMatch = sectionTitleRegex.exec(weekText)) !== null) {
        sectionTitles.push(sectionMatch[2].trim());
      }
      
      // 각 섹션 파싱
      sectionTexts.forEach((sectionText, sIdx) => {
        if (sIdx === 0 && !sectionTitles.length) return; // 첫 부분이 섹션이 아닌 경우 스킵
        
        const sectionData = {
          title: sectionTitles[sIdx - 1] || `Section ${sIdx}`,
          subsections: []
        };
        
        // 하위 섹션 파싱 (1., 2. 등으로 시작하거나 ▶, ◇ 등의 특수문자로 시작)
        const subsectionRegex = /(?:\d+\.|▶|◇|■)[^\n]+(?:\n(?!(?:\d+\.|▶|◇|■))[^\n]+)*/g;
        let subsectionMatch;
        const subsectionTexts = [];
        
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
    
    setParsedData(parsedWeeks);
    setLoading(false);
    
    // 공유 URL 생성
    generateShareURL(text);
  };
  
  // 뉴스 항목 파싱
  const parseNewsItems = (text) => {
    if (!text) return [];
    
    const items = [];
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
  const generateShareURL = (text) => {
    const encodedText = btoa(encodeURIComponent(text));
    const url = `${window.location.origin}${window.location.pathname}?data=${encodedText}`;
    setShareURL(url);
  };
  
  // 클립보드에 공유 URL 복사
  const copyShareURL = () => {
    navigator.clipboard.writeText(shareURL).then(() => {
      alert('Share URL copied to clipboard!');
    }).catch(err => {
      console.error('Error copying to clipboard:', err);
    });
  };
  
  // PNG 다운로드
  const handleDownload = async () => {
    if (!reportRef.current) return;
    
    try {
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
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Error generating image. Please try again.');
    }
  };
  
  // 주요 섹션 컴포넌트
  const Section = ({ title, children }) => (
    <div className="mb-6">
      <h2 className="text-xl font-bold mb-3 text-blue-800 border-b border-gray-200 pb-2">{title}</h2>
      <div>{children}</div>
    </div>
  );

  // 뉴스 카드 컴포넌트
  const NewsCard = ({ title, content, highlight = false }) => (
    <div className={`p-4 mb-4 rounded-lg shadow ${highlight ? 'bg-yellow-50 border-l-4 border-yellow-400' : 'bg-white'}`}>
      {title && <h3 className="font-bold text-lg mb-2">{title}</h3>}
      <div className="text-sm">{content}</div>
    </div>
  );

  // 작은 뉴스 아이템 컴포넌트
  const NewsItem = ({ children, highlight = false }) => (
    <div className={`py-1 ${highlight ? 'font-medium text-red-700' : ''}`}>
      {highlight ? '📍 ' : 'ㆍ'} {children}
    </div>
  );
  
  // 제출 핸들러
  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      parseText(inputText);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <header className="text-center py-6">
        <h1 className="text-3xl font-bold text-blue-900">Economic Report Generator</h1>
        <p className="text-gray-600 mt-2">Paste your economic news text and generate a formatted report</p>
      </header>
      
      <div className="mb-8 bg-white rounded-lg shadow p-4">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="reportText" className="block text-sm font-medium text-gray-700 mb-2">
              Paste your economic news text
            </label>
            <textarea
              id="reportText"
              className="w-full h-64 p-3 border border-gray-300 rounded-md"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your economic report text here (starting with ♧ 2.3 月 News & Trends ♧)"
            ></textarea>
          </div>
          <div className="flex justify-between">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Generate Report'}
            </button>
            {parsedData.length > 0 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyShareURL}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                  Copy Share URL
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
                >
                  Download as PNG
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
      
      {parsedData.length > 0 && (
        <div ref={reportRef} className="bg-gray-50 p-6 rounded-lg shadow-lg">
          <div className="bg-white rounded-lg shadow p-4">
            {/* 커스텀 탭 네비게이션 */}
            <div className="flex border-b mb-4 overflow-x-auto">
              {parsedData.map((week, index) => (
                <button
                  key={index}
                  className={`px-4 py-2 text-center cursor-pointer hover:bg-blue-50 focus:outline-none ${
                    activeTab === index ? 'border-b-2 border-blue-500 font-medium' : ''
                  }`}
                  onClick={() => setActiveTab(index)}
                >
                  {week.title}
                </button>
              ))}
            </div>
            
            {/* 탭 콘텐츠 */}
            {parsedData[activeTab] && (
              <div className="p-2">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-blue-800">♧ {parsedData[activeTab].title} News & Trends ♧</h2>
                  {parsedData[activeTab].quote && (
                    <p className="italic text-gray-600 mt-2">"{parsedData[activeTab].quote}"</p>
                  )}
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
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
          
          <footer className="text-center text-gray-500 text-sm mt-8 pb-4">
            © 2025 Economic News & Trends Report
          </footer>
        </div>
      )}
    </div>
  );
};

export default EconomicReportGenerator;