import {PieChart, Pie, Cell, ResponsiveContainer, Tooltip, type TooltipProps} from 'recharts';
import type {StockAnalyticResponse} from "@/types/analytics/stockAnalytics.ts";

// --- 타입 정의 (유지) ---
interface ExpiryChartData {
    name: string;
    value: number;
    color: string;
    percent: string;
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
            <div
                className="rounded-xl border border-gray-100 bg-white/95 p-3 shadow-xl backdrop-blur-sm z-50 ring-1 ring-black/5">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{color: data.color}}>
                    {data.name} 상태
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

    const chartData: ExpiryChartData[] = (() => {
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
            else if (diffDays <= 7) warning++;
            else safe++;
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
    })();

    const hasData = chartData.some(d => d.value > 0);

    return (
        <div className="flex flex-col h-full w-full">
            {/* 1. min-h-0과 aspect-square 등을 활용해 컨테이너 비율 최적화 */}
            <div className="flex-1 relative min-h-[240px] w-full mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={hasData ? chartData : [{name: 'Empty', value: 1, color: '#f3f4f6', percent: '0'}]}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius="70%" // 2. 더 얇고 깔끔한 도넛을 위해 비율 조정
                            outerRadius="95%"
                            paddingAngle={hasData ? 4 : 0} // 3. 데이터가 있을 때만 조각 사이 간격 부여
                            minAngle={15} // 4. 값이 아주 작아도 원형이 깨지지 않게 최소 각도 설정
                            startAngle={90}
                            endAngle={-270}
                            stroke="none"
                            cornerRadius={4} // 5. 조각 끝을 살짝 둥글게 하여 더 원형에 가깝게 보이게 함
                        >
                            {hasData ? (
                                chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                        style={{outline: 'none'}}
                                    />
                                ))
                            ) : (
                                <Cell fill="#f3f4f6"/>
                            )}
                        </Pie>

                        {hasData && (
                            <Tooltip
                                content={<CustomTooltip/>}
                                offset={15}
                                cursor={false}
                                allowEscapeViewBox={{x: true, y: true}}
                            />
                        )}
                    </PieChart>
                </ResponsiveContainer>

                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total</p>
                    <p className="text-2xl font-black text-gray-900 leading-none">{data.length}</p>
                </div>
            </div>

            <div className="flex justify-center items-center gap-4 mt-4 pb-2">
                {chartData.map((entry, index) => (
                    <div key={`legend-${index}`} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: entry.color}}/>
                        <span className="text-[11px] font-bold text-gray-500">
                            {entry.name}
                            <span className="text-gray-400 font-medium ml-1">({entry.percent}%)</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ExpiryStatusChart;