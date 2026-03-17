import Loading from '@/components/loading/Loading';
import {useState, useEffect, useMemo} from 'react';
import {Search, Users, Trash2, Loader2} from 'lucide-react';
import {getStoreMembers, updateMemberStatus} from '@/api/store/storeMember.ts';
import {requireStorePublicId} from '@/utils/store';
import type {StoreMemberResponse, StoreMemberRole} from '@/types';

const RoleBadge = ({role}: { role: StoreMemberRole }) => {
    if (role === 'OWNER') {
        return (
            <span className="px-2 py-1 rounded-md bg-black text-white text-[10px] font-black uppercase tracking-wider">
        대표
      </span>
        );
    }
    return (
        <span
            className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider border border-gray-200">
      직원
    </span>
    );
};

export default function StoreMemberPage() {
    const storePublicId = requireStorePublicId();

    const [members, setMembers] = useState<StoreMemberResponse[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false); // 전체 로딩용 상태
    const [deletingId, setDeletingId] = useState<number | null>(null); // 개별 버튼 상태

    const loadMembers = async () => {
        setIsLoading(true);
        try {
            const data = await getStoreMembers(storePublicId);
            setMembers(data);
        } catch (error) {
            console.error("Failed to load store members:", error);
            alert("직원 목록을 불러오는 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadMembers();
    }, []);

    const handleDeleteMember = async (member: StoreMemberResponse) => {
        const confirmed = window.confirm(
            `삭제하면 해당 직원의 접근 권한이 제거되며, 직원 목록에서 숨김 처리됩니다.\n\n${member.userName}님을 삭제하시겠습니까?`
        );

        if (!confirmed) return;

        setDeletingId(member.storeMemberId);
        setIsDeleting(true); // 전체 화면 로딩 시작

        try {
            await updateMemberStatus(storePublicId, member.storeMemberId, {status: 'INACTIVE'});
            await loadMembers(); // 목록 새로고침
        } catch (error: any) {
            console.error("Failed to delete member:", error);
            alert(error.response?.data?.message || "직원 삭제에 실패했습니다.");
        } finally {
            setDeletingId(null);
            setIsDeleting(false); // 전체 화면 로딩 종료
        }
    };

    const filteredMembers = useMemo(() => {
        return members
            .filter(member => member.status === 'ACTIVE')
            .filter(member => {
                const matchesSearch = member.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    member.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesSearch;
            })
            .sort((a, b) => {
                if (a.role === 'OWNER' && b.role !== 'OWNER') return -1;
                if (a.role !== 'OWNER' && b.role === 'OWNER') return 1;
                return 0;
            });
    }, [members, searchTerm]);

    const activeCount = members.filter(m => m.status === 'ACTIVE').length;

    return (
        <>
            {/* 삭제 처리 중 전체 화면 로딩 */}
            {isDeleting && <Loading/>}

            <div className="min-h-screen bg-white">
                {/* Header */}
                <header className="border-b border-gray-100 py-8 px-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-end justify-between">
                            <div>
                                <h1 className="text-3xl font-black tracking-tight text-gray-900">직원 관리</h1>
                                <p className="mt-3 text-sm text-gray-400 font-bold">
                                    현재 활성화된 멤버 <span className="text-black">{activeCount}</span>명
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-8 py-10">
                    {/* Search Bar */}
                    <div className="mb-8">
                        <div className="relative max-w-md group">
              <span
                  className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 group-focus-within:text-black transition-colors">
                <Search className="w-4 h-4"/>
              </span>
                            <input
                                type="text"
                                placeholder="이름 또는 이메일로 검색..."
                                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:outline-none focus:border-transparent bg-gray-50 focus:bg-white transition-all text-sm font-bold shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Member Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">직원
                                    정보
                                </th>
                                <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">이메일
                                    주소
                                </th>
                                <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest">권한</th>
                                <th className="px-8 py-5 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">관리</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center">
                                        <Loader2 className="w-8 h-8 text-black animate-spin mx-auto mb-4"/>
                                        <p className="text-sm text-gray-400 font-bold">멤버 목록을 불러오고 있습니다</p>
                                    </td>
                                </tr>
                            ) : filteredMembers.length > 0 ? (
                                filteredMembers.map((member) => (
                                    <tr key={member.storeMemberId}
                                        className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white text-sm font-black shadow-lg shadow-black/10">
                                                    {member.userName.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-gray-900">{member.userName}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span
                                                className="text-sm text-gray-500 font-medium">{member.userEmail}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <RoleBadge role={member.role}/>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            {member.role !== 'OWNER' && (
                                                <button
                                                    onClick={() => handleDeleteMember(member)}
                                                    disabled={deletingId === member.storeMemberId}
                                                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black text-red-500 border border-transparent rounded-lg hover:bg-red-50 hover:border-red-100 transition-all disabled:opacity-30"
                                                >
                                                    {deletingId === member.storeMemberId ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                                                    ) : (
                                                        <Trash2 className="w-3.5 h-3.5"/>
                                                    )}
                                                    삭제
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-8 py-24 text-center">
                                        <div
                                            className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 rounded-2xl mb-4">
                                            <Users className="w-8 h-8 text-gray-200"/>
                                        </div>
                                        <p className="text-sm text-gray-400 font-black">
                                            {searchTerm ? '검색 결과가 없습니다' : '아직 등록된 직원이 없습니다'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </>
    );
}