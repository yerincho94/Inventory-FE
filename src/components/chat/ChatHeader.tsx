import { ChevronLeft, Menu, PanelLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ChatStatusBadge } from './ChatStatusBadge';
import type { ConnectionStatus } from '@/types';

interface ChatHeaderProps {
  connectionStatus: ConnectionStatus;
  isProcessing?: boolean;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export const ChatHeader = ({
  connectionStatus,
  isProcessing = false,
  onToggleSidebar,
  isSidebarCollapsed = false,
}: ChatHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        {/* 좌측: 햄버거 메뉴(모바일) & 돌아가기 버튼 & 챗봇 정보 */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          {/* 사이드바 토글 버튼 */}
          {onToggleSidebar && (
            <>
              {/* 모바일: 햄버거 메뉴 */}
              <button
                onClick={onToggleSidebar}
                className="lg:hidden flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="메뉴 열기"
              >
                <Menu className="w-5 h-5 text-gray-700" />
              </button>

              {/* 데스크톱: 사이드바가 접혀있을 때만 펼치기 버튼 표시 */}
              {isSidebarCollapsed && (
                <button
                  onClick={onToggleSidebar}
                  className="hidden lg:flex flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="사이드바 펼치기"
                >
                  <PanelLeft className="w-5 h-5 text-gray-700" />
                </button>
              )}
            </>
          )}

          {/* 돌아가기 버튼 */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm font-medium flex-shrink-0"
            title="대시보드로 돌아가기"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">돌아가기</span>
          </button>

          <div className="hidden sm:block w-px h-8 bg-gray-200 mx-1 flex-shrink-0" />

          {/* 챗봇 정보 */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-white shadow-md ring-1 ring-gray-100 bg-gray-50 flex items-center justify-center flex-shrink-0">
              <img
                src="/images/chatbot.png"
                alt="수셰프"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight truncate">수셰프</h2>
              <ChatStatusBadge status={connectionStatus} isProcessing={isProcessing} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
