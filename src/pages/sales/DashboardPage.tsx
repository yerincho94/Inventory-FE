import {useState, useEffect, useMemo} from 'react';
import {getMyStores} from '@/api/store/store.ts';
import * as SalesApi from '@/api/analytics/salesAnalytics';
import {getStockAnalysis} from '@/api/analytics/stockAnalytics';
import type {MyStoreResponse} from '@/types';
import type {SalesSummaryResponse, SalesTrendData} from '@/types/analytics/salesAnalytics.ts';
import type {StockAnalyticResponse} from '@/types/analytics/stockAnalytics.ts';
import {TrendingUp, Package, Users, Calendar, AlertTriangle} from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';

import Loading from '@/components/loading/Loading';

const DashboardPage = () => {
    const [currentStore, setCurrentStore] = useState<MyStoreResponse | null>(null);
    const [summary, setSummary] = useState<SalesSummaryResponse | null>(null);
    const [trend, setTrend] = useState<SalesTrendData[]>([]);
    const [stockAnalysis, setStockAnalysis] = useState<StockAnalyticResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initDashboard = async () => {
            try {
                const storesData = await getMyStores();
                if (storesData.length > 0) {
                    const store = storesData[0];
                    setCurrentStore(store);

                    const now = new Date();
                    const oneMonthAgo = new Date();
                    oneMonthAgo.setMonth(now.getMonth() - 1);

                    const [summaryData, trendData, stockData] = await Promise.all([
                        SalesApi.getSalesSummary(store.storePublicId, oneMonthAgo, now),
                        SalesApi.getSalesTrend(store.storePublicId, oneMonthAgo, now),
                        getStockAnalysis(store.storePublicId)
                    ]);

                    setSummary(summaryData);
                    setTrend(trendData);
                    setStockAnalysis(stockData);
                }
            } catch (error) {
                console.error('데이터 호출 실패:', error);
            } finally {
                // 데이터 로딩이 끝나면 약간의 여유를 두고 로딩창을 닫으면 더 자연스럽습니다.
                setTimeout(() => setIsLoading(false), 500);
            }
        };
        initDashboard();
    }, []);

    const chartData = useMemo(() => {
        return trend.map(item => ({
            ...item,
            salesInTenThousand: item.totalAmount / 10000,
        }));
    }, [trend]);

    // 로딩 상태일 때 작성하신 Loading 컴포넌트 노출
    if (isLoading || !currentStore) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white">
                <Loading/>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-gray-900">{currentStore.storeName}</h1>
                        <p className="mt-1 text-sm text-gray-500">통합 분석 리포트</p>
                    </div>
                    <div
                        className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 text-sm font-medium text-gray-600">
                        {new Date().toLocaleDateString('ko-KR', {year: 'numeric', month: 'long', day: 'numeric'})}
                    </div>
                </div>

                {/* 1. 핵심 지표 카드 */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                    <Card title="오늘 매출" value={summary ? `${summary.totalAmount.toLocaleString()}원` : '0원'}
                          icon={<TrendingUp className="text-indigo-600"/>}/>
                    <Card title="재고 경고" value={`${stockAnalysis.length}건`} icon={<Package className="text-amber-600"/>}
                          subtitle="품절 임박 포함"/>
                    <Card title="평균 객단가"
                          value={summary ? `${Math.floor(summary.averageOrderAmount).toLocaleString()}원` : '0원'}
                          icon={<Users className="text-green-600"/>}/>
                    <Card title="주문 건수" value={summary ? `${summary.totalOrderCount}건` : '0건'}
                          icon={<Calendar className="text-blue-600"/>}/>
                </div>

                {/* 2. 메인 컨텐츠 (그래프 및 재고) */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-900">최근 매출 추이</h2>
                            <div className="text-xs text-gray-400 font-medium">단위: 만 원</div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                                    <XAxis dataKey="date" tick={{fontSize: 11}} tickLine={false} axisLine={false}
                                           minTickGap={25}/>
                                    <YAxis tick={{fontSize: 11}} tickLine={false} axisLine={false}/>
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '12px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                        }}
                                    />
                                    <Area type="monotone" dataKey="salesInTenThousand" name="매출(만)" stroke="#4f46e5"
                                          strokeWidth={2} fillOpacity={1} fill="url(#colorSales)"/>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 재고 위젯 */}
                    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            재고 상태 분석 <AlertTriangle className="h-4 w-4 text-amber-500"/>
                        </h2>
                        <div className="space-y-4">
                            {stockAnalysis.length > 0 ? (
                                stockAnalysis.slice(0, 7).map((item, idx) => (
                                    <div key={idx}
                                         className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                                        <span className="text-sm font-medium text-gray-700">{item.ingredientName}</span>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.currentQuantity === 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                                {item.currentQuantity === 0 ? '품절' : '부족'}
                                            </span>
                                            <span
                                                className="text-xs font-semibold text-gray-900">{item.currentQuantity}개</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-gray-400">
                                    <Package className="h-12 w-12 mx-auto mb-2 opacity-10"/>
                                    <p className="text-sm font-medium">안정적인 재고 상태입니다.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Card = ({title, value, icon, subtitle}: {
    title: string,
    value: string,
    icon: React.ReactNode,
    subtitle?: string
}) => (
    <div
        className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 hover:border-indigo-100 transition-all duration-200 hover:shadow-md">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
                <p className="mt-2 text-2xl font-black text-gray-900">{value}</p>
                {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
            </div>
            <div className="p-3 bg-gray-50 rounded-xl text-indigo-600">{icon}</div>
        </div>
    </div>
);

export default DashboardPage;