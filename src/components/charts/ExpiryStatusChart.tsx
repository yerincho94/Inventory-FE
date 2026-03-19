import {PieChart, Pie, Cell, ResponsiveContainer, Tooltip, type TooltipProps} from 'recharts';
import type {StockAnalyticResponse} from "@/types/analytics/stockAnalytics.ts";
import {useMemo} from 'react';

// --- 타입 정의 ---
interface ExpiryChartData {
    name: string;
    value: number;
    color: string;
    percent: string;
    description: string;
}

type CustomTooltipProps = TooltipProps<number, string> & {
    payload?: Array<{
        payload: ExpiryChartData;
    }>;
};

const CustomTooltip = ({active, payload}: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            /* bg-white/95와 backdrop-blur-sm 덕분에 아래의 Total 글자가 깔끔하게 가려집니다 */
            <div
                className="rounded-xl border border-gray-100 bg-white/95 p-3 shadow-xl backdrop-blur-sm ring-1 ring-black/5 min-w-[120px]">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{color: data.color}}>
                    {data.name} 상태 ({data.description})
                </p>
                <div className="space-y-0.5">
                    <p className="text-sm font-black text-gray-900">
                        {data.value}개 <span className="text-gray-400 font-medium ml-1">({data.percent}%)</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

// --- 메인 차트 컴포넌트 ---
const ExpiryStatusChart = ({data}: { data: StockAnalyticResponse[] }) => {
    const COLORS = ['#ef4444', '#f59e0b', '#10b981'];

    const chartData: ExpiryChartData[] = useMemo(() => {
        let risk = 0, warning = 0, safe = 0;
        const now = new Date();

        data.forEach(item => {
            if (!item.minExpirationDate) {
                safe++;
                return;
            }
            const diffTime = new Date(item.minExpirationDate).getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

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
            {/* 차트 영역 */}
            <div className="flex-1 relative min-h-[220px] w-full mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={hasData ? chartData : [{name: 'Empty', value: 1, color: '#f3f4f6', percent: '0'}]}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius="72%"
                            outerRadius="95%"
                            paddingAngle={hasData ? 5 : 0}
                            minAngle={15}
                            startAngle={90}
                            endAngle={-270}
                            stroke="none"
                            cornerRadius={6}
                        >
                            {hasData ? (
                                chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} style={{outline: 'none'}}/>
                                ))
                            ) : (
                                <Cell fill="#f3f4f6"/>
                            )}
                        </Pie>

                        {hasData && (
                            <Tooltip
                                content={<CustomTooltip/>}
                                cursor={false}
                                /* wrapperStyle에 zIndex를 주어 중앙 글자보다 위로 올립니다 */
                                wrapperStyle={{zIndex: 100}}
                            />
                        )}
                    </PieChart>
                </ResponsiveContainer>

                {/* 중앙 Total 텍스트: z-0으로 설정하여 툴팁(z-100) 아래에 위치하게 함 */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total</p>
                    <p className="text-2xl font-black text-gray-900 leading-none">{data.length}</p>
                </div>
            </div>

            {/* 관리 기준 및 범례 (기존 디자인 유지) */}
            <div className="mt-4 px-1">
                <div
                    className="mb-4 py-3 px-4 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-1 h-1 bg-gray-300 rounded-full"/> 관리 기준
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-black text-red-500">위험</span>
                                <span className="text-[10px] font-bold text-gray-500">~3일</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-black text-amber-500">주의</span>
                                <span className="text-[10px] font-bold text-gray-500">~5일</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-gray-100"/>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">상태 비율</p>
                        <div className="flex items-center gap-2">
                            {chartData.map((entry, idx) => (
                                <div key={idx} className="w-2.5 h-1 rounded-full"
                                     style={{backgroundColor: entry.color}}/>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-center items-center gap-4 pb-2">
                    {chartData.map((entry, index) => (
                        <div key={`legend-${index}`} className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{backgroundColor: entry.color}}/>
                            <span className="text-[11px] font-bold text-gray-500">
                                {entry.name}
                                <span className="text-gray-400 font-medium ml-1">({entry.percent}%)</span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ExpiryStatusChart;