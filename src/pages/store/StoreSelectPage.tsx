import Loading from '@/components/loading/Loading';
import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {getMyStores, setDefaultStore} from '@/api/store/store.ts';
import {setStorePublicId} from '@/utils/store';
import type {MyStoreResponse} from '@/types';
import {Store as StoreIcon, CheckCircle, Loader2} from 'lucide-react';

const StoreSelectPage = () => {
    const navigate = useNavigate();
    const [stores, setStores] = useState<MyStoreResponse[]>([]);
    const [selectedStorePublicId, setSelectedStorePublicId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStores = async () => {
            try {
                const data = await getMyStores();
                setStores(data);

                // 대표 매장이 이미 있으면 자동으로 대시보드로 이동
                const defaultStore = data.find((s) => s.isDefault);
                if (defaultStore) {
                    navigate('/dashboard', {replace: true});
                    return;
                }

                // 매장이 1개면 자동 선택
                if (data.length === 1) {
                    setSelectedStorePublicId(data[0].storePublicId);
                }
            } catch (err) {
                console.error('Failed to fetch stores:', err);
                setError('매장 목록을 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchStores();
    }, [navigate]);

    const handleSubmit = async () => {
        if (!selectedStorePublicId) {
            setError('매장을 선택해주세요.');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            await setDefaultStore(selectedStorePublicId);
            setStorePublicId(selectedStorePublicId);
            navigate('/dashboard', {replace: true});
        } catch (err: any) {
            console.error('Failed to set default store:', err);
            setError(err.response?.data?.message || '대표 매장 설정에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    // 초기 로딩 (데이터 가져오기)
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4"/>
                    <p className="text-gray-600 font-bold">매장 정보를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* 대표 매장 설정 요청 시 전체 화면 로딩 표시 */}
            {submitting && <Loading/>}

            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
                <div className="max-w-2xl mx-auto">
                    <div
                        className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 animate-in fade-in zoom-in duration-300">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div
                                className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                                <StoreIcon className="w-8 h-8 text-indigo-600"/>
                            </div>
                            <h1 className="text-3xl font-black text-gray-900 mb-2">대표 매장 선택</h1>
                            <p className="text-gray-600 font-medium">
                                여러 매장에 소속되어 있습니다. 기본으로 사용할 대표 매장을 선택해주세요.
                            </p>
                            <p className="text-sm text-indigo-600 mt-2 font-bold">
                                * 대표 매장은 나중에 매장 관리에서 변경할 수 있습니다.
                            </p>
                        </div>

                        {/* Store List */}
                        <div className="space-y-3 mb-6">
                            {stores.map((store) => (
                                <button
                                    key={store.storeId}
                                    onClick={() => setSelectedStorePublicId(store.storePublicId)}
                                    className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                                        selectedStorePublicId === store.storePublicId
                                            ? 'border-indigo-600 bg-indigo-50 shadow-md translate-y-[-2px]'
                                            : 'border-gray-100 hover:border-gray-300 bg-white'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className={`text-lg font-black ${
                                                    selectedStorePublicId === store.storePublicId ? 'text-indigo-900' : 'text-gray-900'
                                                }`}>
                                                    {store.storeName}
                                                </h3>
                                                {selectedStorePublicId === store.storePublicId && (
                                                    <CheckCircle className="w-6 h-6 text-indigo-600 fill-indigo-50"/>
                                                )}
                                            </div>
                                            <div className="mt-2 space-y-1">
                                                <p className="text-sm font-bold text-gray-500">
                                                    권한: <span
                                                    className="text-gray-800">{store.myRole === 'OWNER' ? '대표' : '직원'}</span>
                                                </p>
                                                <p className="text-xs text-gray-400 font-mono">
                                                    사업자번호: {store.businessRegistrationNumber}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-in shake-200">
                                <p className="text-sm text-red-600 font-black">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedStorePublicId || submitting}
                            className="w-full bg-indigo-600 text-white px-6 py-4 rounded-xl font-black text-lg hover:bg-indigo-700 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin"/>
                                    설정 저장 중...
                                </>
                            ) : (
                                '선택한 매장으로 시작하기'
                            )}
                        </button>

                        {/* Footer Info */}
                        <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <p className="text-[11px] text-gray-400 text-center leading-relaxed font-medium">
                                대표 매장은 서비스 접속 시 가장 먼저 보여지는 매장입니다.<br/>
                                언제든지 설정 페이지에서 기본 매장을 변경하실 수 있습니다.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default StoreSelectPage;