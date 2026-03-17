import Loading from '@/components/loading/Loading';
import {useState, useEffect} from 'react';
import {getUserProfile} from '@/api/user/user.ts';
import {getMyStores} from '@/api/store/store.ts';
import type {UserProfileResponse, MyStoreResponse} from '@/types';
import {User, Mail, Store as StoreIcon, ShieldCheck, ArrowRight} from 'lucide-react';

export default function MyPage() {
    const [user, setUser] = useState<UserProfileResponse | null>(null);
    const [stores, setStores] = useState<MyStoreResponse[]>([]);
    const [currentStore, setCurrentStore] = useState<MyStoreResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [userData, storesData] = await Promise.all([
                    getUserProfile(),
                    getMyStores()
                ]);
                setUser(userData);
                setStores(storesData);

                // 현재 선택된(Default) 매장을 우선적으로 설정
                const defaultStore = storesData.find(s => s.isDefault);
                if (defaultStore) {
                    setCurrentStore(defaultStore);
                } else if (storesData.length > 0) {
                    setCurrentStore(storesData[0]);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) return <Loading/>;
    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="mx-auto max-w-4xl px-6">
                <div className="mb-10">
                    <h1 className="text-4xl font-black tracking-tight text-gray-900">마이페이지</h1>
                    <p className="mt-2 text-gray-500 font-medium">내 계정 정보와 소속된 매장 현황을 확인하세요.</p>
                </div>

                <div className="grid gap-8">
                    {/* 내 정보 섹션 */}
                    <section
                        className="rounded-2xl bg-white p-8 border border-gray-100 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="h-8 w-1 bg-black rounded-full"/>
                            <h2 className="text-xl font-black text-gray-900">계정 정보</h2>
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                <div
                                    className="flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-sm">
                                    <User className="h-6 w-6 text-gray-400"/>
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">이름</p>
                                    <p className="text-lg font-bold text-gray-900">{user.name}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                <div
                                    className="flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-sm">
                                    <Mail className="h-6 w-6 text-gray-400"/>
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">이메일</p>
                                    <p className="text-lg font-bold text-gray-900">{user.email}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 현재 활성 매장 정보 */}
                    {currentStore && (
                        <section
                            className="rounded-2xl bg-black p-8 shadow-xl shadow-black/10 relative overflow-hidden group">
                            <div
                                className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                                <StoreIcon size={120} className="text-white"/>
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"/>
                                    <h2 className="text-xl font-black text-white">현재 선택된 매장</h2>
                                </div>

                                <div className="flex items-end justify-between">
                                    <div>
                                        <h3 className="text-3xl font-black text-white mb-2">{currentStore.storeName}</h3>
                                        <div
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20">
                                            <ShieldCheck className="w-4 h-4 text-green-400"/>
                                            <span className="text-xs font-bold text-white">
                        {currentStore.myRole === 'OWNER' ? '대표 운영자' : '일반 직원'}
                      </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => window.location.href = '/store/manage'}
                                        className="flex items-center gap-2 text-sm font-black text-white/60 hover:text-white transition-colors"
                                    >
                                        매장 관리로 이동
                                        <ArrowRight size={16}/>
                                    </button>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* 통계 섹션 */}
                    <section className="rounded-2xl bg-white p-8 border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-black text-gray-900 mb-6 italic">Summary</h2>
                        <div className="grid grid-cols-2 gap-6">
                            <div
                                className="group rounded-2xl bg-indigo-50/50 p-6 border border-indigo-100 transition-colors hover:bg-indigo-50">
                                <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">Total
                                    Stores</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-indigo-900">{stores.length}</span>
                                    <span className="text-sm font-bold text-indigo-400">곳</span>
                                </div>
                            </div>

                            <div
                                className="group rounded-2xl bg-emerald-50/50 p-6 border border-emerald-100 transition-colors hover:bg-emerald-50">
                                <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">Ownership</p>
                                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-emerald-900">
                    {stores.filter((s: MyStoreResponse) => s.myRole === 'OWNER').length}
                  </span>
                                    <span className="text-sm font-bold text-emerald-400">곳</span>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}