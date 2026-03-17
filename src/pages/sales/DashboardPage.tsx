import {useState, useEffect, useMemo} from 'react';
import {getMyStores} from '@/api/store/store.ts';
import * as SalesApi from '@/api/analytics/salesAnalytics';
import {getStockAnalysis} from '@/api/analytics/stockAnalytics';
import type {MyStoreResponse, SalesPeakData} from '@/types';
import type {SalesSummaryResponse} from '@/types/analytics/salesAnalytics.ts';
import type {StockAnalyticResponse} from '@/types/analytics/stockAnalytics.ts';
import {
    TrendingUp, Package, Users, Calendar,
    AlertTriangle, Clock, BarChart3, Trash2,
    ChevronRight, Store
} from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, LabelList, type TooltipProps, type LabelProps
} from 'recharts';

import Loading from '@/components/loading/Loading';
import {getStorePublicId, requireStorePublicId} from "@/utils/store.ts";

// --- 1. 타입 인터페이스 정의 ---

interface ExpiryChartData {
    name: string;
    value: number;
    color: string;
    percent: string;
}

interface CustomTooltipPayload<T> {
    payload: T;
    name: string;
    value: number;
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
            <div className="rounded-xl border border-gray-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{color: d.color}}>{d.name} 상태</p>
                <p className="text-sm font-black text-gray-900">{d.value}개 <span
                    className="text-gray-400 font-medium">({d.percent}%)</span></p>
            </div>
        );
    }
    return null;
};

const StockTooltip = ({active, payload}: CustomTooltipProps<StockAnalyticResponse>) => {
    if (active && payload && payload.length > 0) {
        return (
            <div className="bg-white p-2 px-3 border border-gray-100 rounded-xl shadow-lg">
                <p className="text-xs font-bold text-indigo-600">현재 {payload[0].value}개</p>
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
            const diffDays = Math.ceil((new Date(item.minExpirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 3) risk++; else if (diffDays <= 7) warning++; else safe++;
        });
        const total = risk + warning + safe;
        return [
            {name: '위험', value: risk, color: COLORS[0], percent: total > 0 ? (risk / total * 100).toFixed(1) : '0.0'},
            {
                name: '주의',
                value: warning,
                color: COLORS[1],
                percent: total > 0 ? (warning / total * 100).toFixed(1) : '0.0'
            },
            {name: '안전', value: safe, color: COLORS[2], percent: total > 0 ? (safe / total * 100).toFixed(1) : '0.0'},
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
                            innerRadius={80} // 도넛 두께 조절
                            outerRadius={105}
                            startAngle={90}   // 상단 정중앙 시작
                            endAngle={-280}  // 한 바퀴 완전히 회전
                            paddingAngle={1}  // 조각 사이 아주 미세한 간격 (이미지 느낌)
                            stroke="none"      // 테두리 제거 (중요)
                            cornerRadius={5}  // 조각 끝 둥글게
                        >
                            {hasData ? chartData.map((entry, i) => <Cell key={i} fill={entry.color}/>) :
                                <Cell fill="#f3f4f6"/>}
                        </Pie>
                        {hasData && <Tooltip cursor={false} content={<ExpiryTooltip/>}/>}
                    </PieChart>
                </ResponsiveContainer>
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
                    <p className="text-2xl font-black text-gray-900 leading-none">{data.length}</p>
                </div>
            </div>
            <div className="flex justify-center gap-4 mt-2 mb-4">
                {chartData.map((entry, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: entry.color}}/>
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
                <BarChart data={chartData} layout="vertical" margin={{left: -10, right: 80, top: 10, bottom: 10}}>
                    <XAxis type="number" hide/>
                    <YAxis dataKey="ingredientName" type="category"
                           tick={{fontSize: 11, fontWeight: 800, fill: '#4b5563'}} axisLine={false} tickLine={false}
                           width={90}/>

                    {/* 마우스 호버 시 툴팁 표시 추가 */}
                    <Tooltip cursor={{fill: '#f8fafc', radius: 4}} content={<WasteTooltip/>}/>

                    <Bar dataKey="totalWasteAmount" fill="#fca5a5" radius={[0, 6, 6, 0]} barSize={18}>
                        {chartData.map((_, i) => <Cell key={i} fill={i === 0 ? '#ef4444' : '#fda4af'}/>)}
                        <LabelList
                            dataKey="totalWasteAmount"
                            position="right"
                            content={(props: LabelProps) => {
                                const {x, y, height, value, index} = props;

                                const posX = Number(x) || 0;
                                const posY = Number(y) || 0;
                                const barHeight = Number(height) || 0;

                                return (
                                    <text
                                        x={posX + 8}
                                        y={posY + barHeight / 2}
                                        dy={4}
                                        fill={index === 0 ? '#ef4444' : '#9ca3af'}
                                        fontSize={11}
                                        fontWeight="800"
                                    >
                                        {value ? `${Number(value).toLocaleString()}원` : ''}
                                    </text>
                                );
                            }}
                        />
                    </Bar>
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
    const [peak, setPeak] = useState<SalesPeakData[]>([]);
    const [stockAnalysis, setStockAnalysis] = useState<StockAnalyticResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initDashboard = async () => {
            try {
                setIsLoading(true);

                let storeId: string | null = null;
                let targetStore: MyStoreResponse | undefined = undefined;

                const existingId = getStorePublicId();

                if (!existingId) {
                    const storesData = await getMyStores();
                    if (storesData && storesData.length > 0) {
                        targetStore = storesData[0];
                        storeId = targetStore.storePublicId;
                        setCurrentStore(targetStore);
                    }
                } else {
                    storeId = requireStorePublicId();
                    const storesData = await getMyStores();
                    targetStore = storesData.find(s => s.storePublicId === storeId);
                }

                if (storeId && targetStore) {
                    setCurrentStore(targetStore);
                    const now = new Date();
                    const todayStart = new Date();
                    todayStart.setHours(9, 0, 0, 0);
                    if (now < todayStart) todayStart.setDate(todayStart.getDate() - 1);
                    const oneMonthAgo = new Date();
                    oneMonthAgo.setMonth(now.getMonth() - 1);

                    // SalesApi 호출 시 storeId 전달
                    const [summaryData, peakData, stockData] = await Promise.all([
                        SalesApi.getSalesSummary(storeId, oneMonthAgo, now),
                        SalesApi.getSalesPeak(storeId, todayStart, now),
                        getStockAnalysis(storeId)
                    ]);

                    setSummary(summaryData);
                    setPeak(peakData);
                    setStockAnalysis(stockData);
                }
            } catch (error) {
                console.error('대시보드 초기화 실패:', error);
            } finally {
                setTimeout(() => setIsLoading(false), 500);
            }
        };
        initDashboard();
    }, []);

    const todayDayOfWeek = new Date().getDay() || 7;

    const chartData = useMemo(() => {
        return peak
            .filter((item) => item.dayOfWeek === todayDayOfWeek)
            .sort((a, b) => a.hour - b.hour)
            .map((item) => ({
                ...item,
                time: `${item.hour}시`,
                orderCount: item.orderCount,
                // Peak 데이터에 금액이 없다면 주문당 평균 단가를 곱해 가상 매출액 생성 (선택사항)
                amount: item.orderCount * (summary?.averageOrderAmount || 10000)
            }));
    }, [peak, todayDayOfWeek, summary]);

    if (isLoading || !currentStore) {
        return <Loading />;
    }

    return (
        <div className="min-h-screen bg-[#F8F9FB] py-10">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-lg font-bold text-gray-400 flex items-center gap-1"><Store
                            className="h-10 w-10"/> {currentStore.storeName}</h1>
                    </div>
                    <div
                        className="flex items-center gap-2 text-sm font-bold text-gray-400 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
                        <Calendar className="h-4 w-4"/>
                        {new Date().toLocaleDateString('ko-KR', {year: 'numeric', month: 'long', day: 'numeric'})}
                    </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
                    <Card title="실시간 매출" value={summary ? `${summary.totalAmount.toLocaleString()}원` : '0원'}
                          icon={<TrendingUp/>} color="indigo"/>
                    <Card title="재고 부족 경고"
                          value={`${stockAnalysis.filter(i => i.isLowStock || i.currentQuantity === 0).length}건`}
                          icon={<AlertTriangle/>} color="amber"/>
                    <Card title="주문 평균 매출"
                          value={summary ? `${Math.floor(summary.averageOrderAmount).toLocaleString()}원` : '0원'}
                          icon={<Users/>} color="green"/>
                    <Card title="주문" value={summary ? `${summary.totalOrderCount}건` : '0건'} icon={<ChevronRight/>}
                          color="blue"/>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2 rounded-3xl bg-white p-8 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-indigo-600"/> 실시간 매출 분석
                            </h3>
                            <span
                                className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">UNIT: 원</span>
                        </div>
                        <div className="h-[320px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{top: 10, right: 10, left: 10, bottom: 30}}>
                                    <defs>
                                        {/* 매출 그래프에 어울리는 인디고-바이올렛 그라데이션 */}
                                        <linearGradient id="colorHourlySales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>

                                    {/* 가로선만 남겨서 깔끔한 대시보드 느낌 유지 */}
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>

                                    <XAxis
                                        dataKey="time"
                                        height={50}
                                        tick={{fontSize: 11, fontWeight: 700, fill: '#94a3b8'}}
                                        axisLine={false}
                                        tickLine={false}
                                        dy={10}
                                        // 시간 데이터가 24개나 되므로, 겹치지 않게 적절히 조절합니다.
                                        interval={2} // 3시간 단위로 표시 (0시, 3시, 6시...)
                                    />

                                    <YAxis
                                        tick={{fontSize: 11, fontWeight: 700, fill: '#94a3b8'}}
                                        axisLine={false}
                                        tickLine={false}
                                        // 원화 단위 표시 (예: 10,000 -> 10k 또는 그대로 표시)
                                        tickFormatter={(value) => value.toLocaleString()}
                                    />

                                    <Tooltip
                                        cursor={{stroke: '#e2e8f0', strokeWidth: 2}}
                                        formatter={(value: any) => {
                                            if (value === undefined || value === null) return ["0", "매출액"];

                                            return [value.toLocaleString(), "매출액"];
                                        }}
                                        contentStyle={{
                                            borderRadius: '16px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                                            padding: '12px'
                                        }}
                                        labelStyle={{fontWeight: 800, color: '#1e293b', marginBottom: '4px'}}
                                        itemStyle={{fontWeight: 700, color: '#6366f1'}}
                                    />

                                    <Area
                                        type="monotone"
                                        dataKey="amount" // 데이터 객체의 매출액 키값
                                        stroke="#6366f1"
                                        strokeWidth={4} // 선을 조금 더 두껍게 해서 강조
                                        fillOpacity={1}
                                        fill="url(#colorHourlySales)"
                                        // 점(Dot)을 추가하여 시간대별 포인트를 강조하고 싶다면 아래 주석 해제
                                        dot={{r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff'}}
                                        activeDot={{r: 6, strokeWidth: 0}}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-100 flex flex-col">
                        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-orange-500"/> 유통기한 분석
                        </h3>
                        <div className="flex-1 flex items-center">
                            <ExpiryStatusChart data={stockAnalysis}/>
                        </div>
                    </div>

                    <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-indigo-500"/> 부족 재고 Top 5
                        </h3>
                        <StockLevelChart data={stockAnalysis}/>
                    </div>

                    <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-100">
                        <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-2">
                            <Trash2 className="h-5 w-5 text-red-500"/> 폐기 손실 Top 5
                        </h3>
                        <WasteAnalysisChart data={stockAnalysis}/>
                    </div>

                    <div
                        className="rounded-3xl bg-red-400 p-8 shadow-lg shadow-indigo-100 text-white flex flex-col justify-between">
                        <div>
                            <Package className="h-10 w-10 mb-4 opacity-50"/>
                            <h3 className="text-xl font-black mb-2">재고 최적화 팁</h3>
                            <p className="text-indigo-100 text-sm leading-relaxed">
                                유통기한 임박 항목이 {stockAnalysis.filter(i => {
                                if (!i.minExpirationDate) return false;
                                const diff = new Date(i.minExpirationDate).getTime() - new Date().getTime();
                                return diff > 0 && diff <= (3 * 24 * 60 * 60 * 1000);
                            }).length}건 있습니다. 해당 재료를 우선 소진하세요.
                            </p>
                        </div>
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
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-gray-600 transition-colors">{title}</p>
                    <p className="text-2xl font-black text-gray-900">{value}</p>
                </div>
                <div className={`p-3 rounded-2xl ${colorMap[color]}`}>{icon}</div>
            </div>
        </div>
    );
};

export default DashboardPage;
