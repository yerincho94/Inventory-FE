import {Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, LabelList, type TooltipProps} from "recharts";
import type {StockAnalyticResponse} from "@/types/analytics/stockAnalytics.ts";

interface Props {
    data: StockAnalyticResponse[];
}

// 1. 툴팁 Payload 타입 정의
type CustomTooltipProps = TooltipProps<number, string> & {
    payload?: Array<{
        payload: StockAnalyticResponse;
    }>;
};

const CustomTooltip = ({active, payload}: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        const item = payload[0].payload;
        return (
            <div
                className="rounded-xl border border-gray-100 bg-white p-3 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in duration-200 z-50">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight mb-1">
                    {item.ingredientName}
                </p>
                <div className="flex items-end gap-1">
                    <p className="text-sm font-black text-gray-900">
                        {Number(item.totalWasteAmount).toLocaleString()}원
                    </p>
                    <span className="text-[10px] font-medium text-gray-400 mb-0.5">
                        (총 {item.totalWasteCount}건)
                    </span>
                </div>
            </div>
        );
    }
    return null;
};

// 2. 라벨 Props 타입 정의 (Recharts의 내부 타입을 고려하여 확장)
interface CustomLabelProps {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    value?: number | string;
    index?: number;
}

const CustomLabel = (props: CustomLabelProps) => {
    const {x, y, width, height, value, index} = props;

    if (x === undefined || y === undefined) return null;

    // 수치 계산을 위해 안전하게 Number로 변환
    const posX = Number(x);
    const posY = Number(y);
    const barWidth = Number(width) || 0;
    const barHeight = Number(height) || 0;

    return (
        <text
            x={posX + barWidth + 8}
            y={posY + barHeight / 2}
            dy={4}
            fill={index === 0 ? "#ef4444" : "#9ca3af"}
            fontSize={11}
            fontWeight="800"
            textAnchor="start"
        >
            {Number(value).toLocaleString()}원
        </text>
    );
};

const WasteAnalysisChart = ({data}: Props) => {
    const chartData = [...data]
        .filter(item => Number(item.totalWasteAmount) > 0)
        .sort((a, b) => Number(b.totalWasteAmount) - Number(a.totalWasteAmount))
        .slice(0, 5);

    return (
        <div className="h-full w-full relative">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{left: -20, right: 80, top: 10, bottom: 10}}
                    barCategoryGap="25%"
                >
                    <XAxis type="number" hide/>
                    <YAxis
                        dataKey="ingredientName"
                        type="category"
                        width={100}
                        tick={{fontSize: 12, fontWeight: 700, fill: '#4b5563'}}
                        axisLine={false}
                        tickLine={false}
                    />

                    <Tooltip
                        content={<CustomTooltip/>}
                        cursor={{fill: '#f8fafc', radius: 4}}
                        allowEscapeViewBox={{x: true, y: true}}
                    />

                    <Bar
                        dataKey="totalWasteAmount"
                        barSize={20}
                        radius={[0, 6, 6, 0]}
                        animationDuration={1000}
                    >
                        {chartData.map((_, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={index === 0 ? '#ef4444' : '#fca5a5'}
                            />
                        ))}
                        <LabelList
                            dataKey="totalWasteAmount"
                            content={<CustomLabel/>}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {chartData.length === 0 && (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 z-10 text-center backdrop-blur-[1px]">
                    <div className="p-4 bg-gray-50 rounded-full mb-3">
                        <span className="text-2xl">✨</span>
                    </div>
                    <span className="text-sm font-bold text-gray-400">발생한 폐기 손실이 없습니다.</span>
                </div>
            )}
        </div>
    );
};

export default WasteAnalysisChart;