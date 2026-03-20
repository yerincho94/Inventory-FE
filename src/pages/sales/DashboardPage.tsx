import {useState, useEffect, useMemo} from 'react';
import {getMyStores} from '@/api/store/store.ts';
import * as SalesApi from '@/api/analytics/salesAnalytics';
import {getStockAnalysis} from '@/api/analytics/stockAnalytics';
import type {IngredientUnit, MyStoreResponse, SalesTrendData} from '@/types';
import type {SalesSummaryResponse} from '@/types/analytics/salesAnalytics.ts';
import type {StockAnalyticResponse} from '@/types/analytics/stockAnalytics.ts';
import {
    TrendingUp, Users, Calendar,
    AlertTriangle, Clock, BarChart3, Trash2,
    Store, ShoppingBag, Info
} from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, type TooltipProps
} from 'recharts';

import Loading from '@/components/loading/Loading';
import {getStorePublicId, requireStorePublicId} from "@/utils/store.ts";

// --- 1. 타입 인터페이스 정의 ---

interface ExpiryChartData {
    name: string;
    value: number;
    color: string;
    percent: string;
    description: string;
}

interface CustomTooltipPayload<T> {
    payload: T;
    name: string;
    value: number;
    unit: IngredientUnit;
    color?: string;
}

interface CustomTooltipProps<T> extends TooltipProps<number, string> {
    payload?: CustomTooltipPayload<T>[];
}

// --- 2. 커스텀 툴팁 컴포넌트 ---

const ExpiryTooltip = ({active, payload}: CustomTooltipProps<ExpiryChartData>) => {
    if (active && payload && payload.length > 0) {
        const d = payload[0].payload;
        return (
            <div
                className="rounded-xl border border-gray-100 bg-white/95 p-3 shadow-xl backdrop-blur-sm z-50 ring-1 ring-black/5">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{color: d.color}}>
                    {d.name} 상태 ({d.description})
                </p>
                <p className="text-sm font-black text-gray-900">
                    {d.value}개 <span className="text-gray-400 font-medium ml-1">({d.percent}%)</span>
                </p>
            </div>
        );
    }
    return null;
};

const StockTooltip = ({active, payload}: CustomTooltipProps<StockAnalyticResponse>) => {
    if (active && payload && payload.length > 0) {
        return (
            <div className="bg-white p-2 px-3 border border-gray-100 rounded-xl shadow-lg">
                <p className="text-xs font-bold text-indigo-600">현재 {payload[0].value} {payload[0].payload.unit}</p>
            </div>
        );
    }
    return null;
};

const WasteTooltip = ({active, payload}: CustomTooltipProps<StockAnalyticResponse>) => {
    if (active && payload && payload.length > 0) {
        const item = payload[0].payload;
        return (
            <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-xl ring-1 ring-black/5 z-50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight mb-1">
                    {item.ingredientName}
                </p>
                <p className="text-sm font-black text-red-600">
                    {Number(item.totalWasteAmount).toLocaleString()}원 손실
                </p>
            </div>
        );
    }
    return null;
};

// --- 3. 차트 서브 컴포넌트 ---

const ExpiryStatusChart = ({data}: { data: StockAnalyticResponse[] }) => {
    const COLORS = ['#ef4444', '#f59e0b', '#10b981'];

    const chartData = useMemo(() => {
        let risk = 0, warning = 0, safe = 0;
        const now = new Date();
        data.forEach(item => {
            if (!item.minExpirationDate) {
                safe++;
                return;
            }
            const diffTime = new Date(item.minExpirationDate).getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // 수정된 기준: 3일 이내 위험, 5일 이내 주의
            if (diffDays <= 3) risk++;
            else if (diffDays <= 5) warning++;
            else safe++;
        });
        const total = risk + warning + safe;
        return [
            {
                name: '위험',
                value: risk,
                color: COLORS[0],
                percent: total > 0 ? (risk / total * 100).toFixed(1) : '0.0',
                description: '3일 이내'
            },
            {
                name: '주의',
                value: warning,
                color: COLORS[1],
                percent: total > 0 ? (warning / total * 100).toFixed(1) : '0.0',
                description: '5일 이내'
            },
            {
                name: '안전',
                value: safe,
                color: COLORS[2],
                percent: total > 0 ? (safe / total * 100).toFixed(1) : '0.0',
                description: '정상'
            },
        ];
    }, [data]);

    const hasData = chartData.some(d => d.value > 0);

    return (
        <div className="flex flex-col h-full w-full">
            <div className="flex-1 relative min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={hasData ? chartData : [{value: 1}]}
                            dataKey="value"
                            innerRadius="72%"
                            outerRadius="95%"
                            startAngle={90}
                            endAngle={-270}
                            paddingAngle={hasData ? 5 : 0}
                            stroke="none"
                            cornerRadius={6}
                        >
                            {hasData ? chartData.map((entry, i) => <Cell key={i} fill={entry.color}/>) :
                                <Cell fill="#f3f4f6"/>}
                        </Pie>
                        {hasData && (
                            <Tooltip
                                cursor={false}
                                content={<ExpiryTooltip/>}
                                // 툴팁이 중앙 글자보다 위에 오도록 설정
                                wrapperStyle={{zIndex: 100}}
                            />
                        )}
                    </PieChart>
                </ResponsiveContainer>
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
                    <p className="text-2xl font-black text-gray-900 leading-none">{data.length}</p>
                </div>
            </div>

            {/* 관리 기준 안내 박스 추가 */}
            <div className="mt-4 px-2 py-3 bg-gray-50/50 rounded-2xl border border-gray-100 mb-4">
                <div className="flex items-center gap-3 justify-center">
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black text-red-500">위험</span>
                        <span className="text-[10px] font-bold text-gray-400">~3일</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black text-amber-500">주의</span>
                        <span className="text-[10px] font-bold text-gray-400">~5일</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black text-emerald-500">안전</span>
                        <span className="text-[10px] font-bold text-gray-400">정상</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-center gap-4 pb-2">
                {chartData.map((entry, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{backgroundColor: entry.color}}/>
                        <span className="text-[11px] font-bold text-gray-500">{entry.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const WasteAnalysisChart = ({data}: { data: StockAnalyticResponse[] }) => {
    const chartData = useMemo(() =>
            [...data].filter(item => Number(item.totalWasteAmount) > 0)
                .sort((a, b) => Number(b.totalWasteAmount) - Number(a.totalWasteAmount)).slice(0, 5)
        , [data]);

    if (chartData.length === 0) {
        return (
            <div className="h-[240px] flex flex-col items-center justify-center text-gray-300">
                <div className="p-4 bg-gray-50 rounded-full mb-3"><Trash2 className="h-8 w-8 opacity-20"/></div>
                <p className="text-sm font-bold">발생한 폐기 손실이 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{left: -10, right: 20, top: 10, bottom: 10}}>
                    <XAxis type="number" hide/>
                    <YAxis dataKey="ingredientName" type="category"
                           tick={{fontSize: 11, fontWeight: 800, fill: '#4b5563'}} axisLine={false} tickLine={false}
                           width={90}/>
                    <Tooltip cursor={{fill: '#f8fafc', radius: 4}} content={<WasteTooltip/>}/>
                    <Bar dataKey="totalWasteAmount" fill="#fca5a5" radius={[0, 6, 6, 0]} barSize={18}/>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

const StockLevelChart = ({data}: { data: StockAnalyticResponse[] }) => {
    const chartData = useMemo(() =>
            [...data].sort((a, b) => Number(a.currentQuantity) - Number(b.currentQuantity)).slice(0, 5)
        , [data]);

    return (
        <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{left: -10, right: 40, top: 10, bottom: 10}}>
                    <XAxis type="number" hide/>
                    <YAxis dataKey="ingredientName" type="category"
                           tick={{fontSize: 11, fontWeight: 800, fill: '#4b5563'}} axisLine={false} tickLine={false}
                           width={90}/>
                    <Tooltip cursor={{fill: '#f9fafb', radius: 8}} content={<StockTooltip/>}/>
                    <Bar dataKey="currentQuantity" radius={[0, 6, 6, 0]} barSize={18}>
                        {chartData.map((entry, i) => <Cell key={i} fill={entry.isLowStock ? '#ef4444' : '#6366f1'}/>)}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// --- 4. 메인 대시보드 ---

const DashboardPage = () => {
    const [currentStore, setCurrentStore] = useState<MyStoreResponse | null>(null);
    const [summary, setSummary] = useState<SalesSummaryResponse | null>(null);
    const [stockAnalysis, setStockAnalysis] = useState<StockAnalyticResponse[]>([]);
    const [hourlyTrend, setHourlyTrend] = useState<SalesTrendData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const expiryAlertList = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // 비교를 위해 시간 정규화

        return stockAnalysis
            .filter(item => item.minExpirationDate) // 유통기한 정보가 있는 것만
            .map(item => {
                const expDate = new Date(item.minExpirationDate!);
                expDate.setHours(0, 0, 0, 0);

                // 일수 차이 계산 (D-Day)
                const diffTime = expDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                return {...item, diffDays};
            })
            // 1. 이미 지난 것(음수) 우선 정렬, 2. 임박한 순서(작은 수) 정렬
            .sort((a, b) => a.diffDays - b.diffDays)
            // 7일 이내이거나 이미 지난 항목만 필터링
            .filter(item => item.diffDays <= 7)
            .slice(0, 5);
    }, [stockAnalysis]);

    useEffect(() => {
        let pollingId: ReturnType<typeof setInterval> | null = null;
        let storeId: string | null = null;

        const initDashboard = async () => {
            try {
                setIsLoading(true);
                let targetStore: MyStoreResponse | undefined = undefined;
                const existingId = getStorePublicId();

                if (!existingId) {
                    const storesData = await getMyStores();
                    if (storesData && storesData.length > 0) {
                        targetStore = storesData[0];
                        storeId = targetStore.storePublicId;
                    }
                } else {
                    storeId = requireStorePublicId();
                    const storesData = await getMyStores();
                    targetStore = storesData.find(s => s.storePublicId === storeId);
                }

                if (storeId && targetStore) {
                    setCurrentStore(targetStore);
                    const now = new Date();
                    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                    const [summaryData, stockData, hourlyTrendData] = await Promise.all([
                        SalesApi.getSalesSummary(storeId, todayStart, now),
                        getStockAnalysis(storeId),
                        SalesApi.getHourlySalesTrend(storeId, todayStart, now)
                    ]);

                    setSummary(summaryData);
                    setStockAnalysis(stockData);
                    setHourlyTrend(hourlyTrendData);

                    pollingId = setInterval(async () => {
                        try {
                            const pNow = new Date();
                            const pStart = new Date(pNow.getFullYear(), pNow.getMonth(), pNow.getDate());
                            const data = await SalesApi.getSalesSummary(storeId!, pStart, pNow);
                            setSummary(data);
                        } catch (err) {
                            console.error(err);
                        }
                    }, 30000);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setTimeout(() => setIsLoading(false), 500);
            }
        };

        initDashboard();
        return () => {
            if (pollingId) clearInterval(pollingId);
        };
    }, []);

    const chartData = useMemo(() => {
        return hourlyTrend.map((item) => ({
            time: item.date.substring(11, 16),
            amount: Number(item.totalAmount),
            orderCount: item.orderCount
        }));
    }, [hourlyTrend]);

    if (isLoading || !currentStore) return <Loading/>;

    return (
        <div className="min-h-screen bg-[#F8F9FB] py-10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-1"><Store
                            className="h-10 w-10"/> {currentStore.storeName}</h1>
                    </div>
                    <div
                        className="flex items-center gap-2 text-sm font-bold text-gray-900 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
                        <Calendar className="h-4 w-4"/>
                        {new Date().toLocaleDateString('ko-KR', {year: 'numeric', month: 'long', day: 'numeric'})}
                    </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
                    <Card title="실시간 매출" value={summary ? `${summary.totalAmount.toLocaleString()}원` : '0원'}
                          icon={<TrendingUp size={20}/>} color="indigo"/>
                    <Card title="재고 부족 경고"
                          value={`${stockAnalysis.filter(i => i.isLowStock || i.currentQuantity === 0).length}건`}
                          icon={<AlertTriangle size={20}/>} color="amber"/>
                    <Card title="주문 평균 객단가"
                          value={summary ? `${Math.floor(summary.averageOrderAmount).toLocaleString()}원` : '0원'}
                          icon={<Users size={20}/>} color="green"/>
                    {/* 아이콘 수정: ShoppingBag */}
                    <Card title="주문" value={summary ? `${summary.totalOrderCount}건` : '0건'}
                          icon={<ShoppingBag size={20}/>} color="blue"/>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* 실시간 매출 분석 AreaChart */}
                    <div className="lg:col-span-2 rounded-3xl bg-white p-8 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2"><TrendingUp
                                className="h-5 w-5 text-gray-900"/> 실시간 매출 분석</h3>
                            <span
                                className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded uppercase tracking-wider">Unit: Won</span>
                        </div>
                        <div className="h-[320px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{top: 10, right: 10, left: 10, bottom: 30}}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                    <XAxis dataKey="time" height={50}
                                           tick={{fontSize: 11, fontWeight: 700, fill: '#cbd5e1'}} axisLine={false}
                                           tickLine={false} dy={10} interval={0}/>
                                    <YAxis tick={{fontSize: 11, fontWeight: 700, fill: '#cbd5e1'}} axisLine={false}
                                           tickLine={false} tickFormatter={(v) => v.toLocaleString()}/>
                                    <Tooltip cursor={{stroke: '#e2e8f0', strokeWidth: 2}}
                                             formatter={(v) => [Number(v).toLocaleString(), "매출액"]} contentStyle={{
                                        borderRadius: '16px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        padding: '12px'
                                    }} labelStyle={{fontWeight: 800, color: '#1e293b', marginBottom: '4px'}}
                                             itemStyle={{fontWeight: 700, color: '#475569'}}/>
                                    <Area type="monotone" dataKey="amount" stroke="#1e293b" strokeWidth={3}
                                          fillOpacity={0} dot={{r: 3, fill: '#fff', strokeWidth: 2, stroke: '#1e293b'}}
                                          activeDot={{r: 5, fill: '#1e293b', strokeWidth: 0}}/>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 유통기한 분석 PieChart */}
                    <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-100 flex flex-col">
                        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2"><Clock
                            className="h-5 w-5 text-orange-500"/> 유통기한 분석</h3>
                        <div className="flex-1 flex items-center"><ExpiryStatusChart data={stockAnalysis}/></div>
                    </div>

                    <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-2"><BarChart3
                            className="h-5 w-5 text-indigo-500"/> 재고량 하위 5</h3>
                        <StockLevelChart data={stockAnalysis}/>
                    </div>

                    <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-2"><Trash2
                            className="h-5 w-5 text-red-500"/> 폐기 손실 Top 5</h3>
                        <WasteAnalysisChart data={stockAnalysis}/>
                    </div>

                    {/* 알림 카드 */}
                    <div className="rounded-3xl bg-black p-8 shadow-lg text-white flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-6">
                            <Info className="h-6 w-6 text-indigo-400"/>
                            <span
                                className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Smart Tip</span>
                        </div>

                        <h3 className="text-xl font-black mb-4">재고 최적화 알림</h3>

                        {expiryAlertList.length > 0 ? (
                            <div className="space-y-4 flex-1">
                                <p className="text-gray-400 text-sm mb-4">
                                    관리가 필요한 품목이 <span
                                    className="text-red-400 font-bold">{expiryAlertList.length}건</span> 확인되었습니다.
                                </p>
                                <div className="space-y-3">
                                    {expiryAlertList.map((item, idx) => (
                                        <div key={idx}
                                             className="flex items-center justify-between border-b border-white/10 pb-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-bold text-white truncate max-w-[140px]">
                                                    {item.ingredientName}
                                                </span>
                                                <span className="text-[11px] text-gray-500 font-medium">
                                                    재고: {item.currentQuantity} {item.unit}
                                                </span>
                                            </div>
                                            <div className={`text-[11px] font-black px-2.5 py-1.5 rounded-xl ${
                                                item.diffDays < 0
                                                    ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                                                    : 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30'
                                            }`}>
                                                {item.diffDays < 0
                                                    ? `${Math.abs(item.diffDays)}일 지남`
                                                    : item.diffDays === 0 ? '오늘 만료' : `${item.diffDays}일 남음`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-400 text-sm leading-relaxed">
                                현재 유통기한 이슈가 있는 품목이 없습니다. <br/>
                                매우 청결하게 관리되고 있네요!
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Card = ({title, value, icon, color}: { title: string, value: string, icon: React.ReactNode, color: string }) => {
    const colorMap: Record<string, string> = {
        indigo: "text-indigo-600 bg-indigo-50",
        amber: "text-amber-600 bg-amber-50",
        green: "text-green-600 bg-green-50",
        blue: "text-blue-600 bg-blue-50"
    };
    return (
        <div
            className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[13px] font-black text-gray-500 uppercase tracking-widest mb-1 group-hover:text-gray-700 transition-colors">{title}</p>
                    <p className="text-2xl font-black text-gray-900">{value}</p>
                </div>
                <div className={`p-3 rounded-2xl ${colorMap[color]}`}>{icon}</div>
            </div>
        </div>
    );
};

export default DashboardPage;