import {useEffect, useState, useCallback} from 'react';
import {getSalesOrders} from '@/api';
import {requireStorePublicId} from '@/utils/store';
import type {SalesOrderResponse, SalesOrderStatus} from '@/types/sales/salesOrder.ts';
import type {PageResponse} from '@/types/common/common';
import SalesOrderDetailModal from './SalesOrderDetailModal';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import Loading from '@/components/loading/Loading';
import axios from 'axios';

type VIEW = 'LIST' | 'DETAIL';

function StatusBadge({status}: { status: SalesOrderStatus }) {
    const styles = {
        COMPLETED: 'bg-blue-100 text-blue-700 border border-blue-200',
        REFUNDED: 'bg-rose-100 text-rose-700 border border-rose-200',
    };

    const labels = {
        COMPLETED: '완료',
        REFUNDED: '환불',
    };

    return (
        <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}
        >
            {labels[status]}
        </span>
    );
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD HH:mm)
 */
function formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/**
 * 금액 포맷팅
 */
function formatAmount(amount: number): string {
    return amount.toLocaleString('ko-KR');
}

function formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

export default function SalesOrderListPage() {
    const today = new Date();

    const [view, setView] = useState<VIEW>('LIST');
    const [pageData, setPageData] = useState<PageResponse<SalesOrderResponse> | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<SalesOrderResponse | null>(
        null
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [searchTrigger, setSearchTrigger] = useState(0);

    const storePublicId = requireStorePublicId();

    const [from, setFrom] = useState<string>('');
    const [to, setTo] = useState<string>('');
    const [status, setStatus] = useState<SalesOrderStatus | ''>('');
    const [amountMin, setAmountMin] = useState<string>('');
    const [amountMax, setAmountMax] = useState<string>('');

    // 주문 목록 조회
    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getSalesOrders(storePublicId, {
                page,
                size: 20,
                from: from ? `${from}T00:00:00+09:00` : undefined,
                to: to ? `${to}T23:59:59+09:00` : undefined,
                status: status || undefined,
                amountMin: amountMin ? Number(amountMin) : undefined,
                amountMax: amountMax ? Number(amountMax) : undefined,
            });
            setPageData(response.data);
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('주문 목록을 불러오는데 실패했습니다.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [storePublicId, page, from, to, status, amountMin, amountMax]);

    useEffect(() => {
        fetchOrders();
    }, [page, searchTrigger]);

    // 주문 상세 보기
    const handleViewDetail = (order: SalesOrderResponse) => {
        setSelectedOrder(order);
        setView('DETAIL');
    };

    // 상세 모달 닫기
    const handleCloseDetail = () => {
        setView('LIST');
        setSelectedOrder(null);
    };

    // 환불 후 목록 새로고침
    const handleRefunded = () => {
        setSearchTrigger(prev => prev + 1);
        handleCloseDetail();
    };

    const orders = pageData?.content || [];

    if (isLoading) {
        return <Loading/>;
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-6">
            <div className="mx-auto max-w-7xl">
                {/* 헤더 */}
                <div className="mb-6">
                    <h1 className="text-3xl font-black tracking-tight text-gray-900">주문 현황</h1>
                    <p className="mt-3 text-sm text-gray-500">
                        매장의 모든 주문 내역을 확인할 수 있습니다.
                    </p>
                </div>

                {/* 필터 영역 */}
                <div className="mb-6 flex flex-wrap items-end gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    {/* 기간 */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-slate-600">기간</label>
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                        <span className="text-slate-400">~</span>
                        <input
                            type="date"
                            value={to}
                            max={formatDate(today)}
                            onChange={(e) => setTo(e.target.value)}
                            className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                    </div>

                    {/* 상태 */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-slate-600">상태</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as SalesOrderStatus | '')}
                            className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        >
                            <option value="">전체</option>
                            <option value="COMPLETED">완료</option>
                            <option value="REFUNDED">환불</option>
                        </select>
                    </div>

                    {/* 금액 범위 */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-slate-600">금액</label>
                        <input
                            type="number"
                            min="0"
                            placeholder="최소"
                            value={amountMin}
                            onChange={(e) => setAmountMin(e.target.value)}
                            className="text-sm border border-slate-200 rounded-xl px-3 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                        <span className="text-slate-400">~</span>
                        <input
                            type="number"
                            placeholder="최대"
                            value={amountMax}
                            onChange={(e) => setAmountMax(e.target.value)}
                            className="text-sm border border-slate-200 rounded-xl px-3 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                    </div>

                    {/* 조회 버튼 */}
                    <button
                        onClick={() => {
                            if (page === 0) {
                                setSearchTrigger(prev => prev + 1);
                            } else {
                                setPage(0);
                            }
                        }}
                        className="bg-slate-900 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-slate-700 transition-all"
                    >
                        조회
                    </button>

                    <button
                        onClick={() => {
                            setFrom('');
                            setTo('');
                            setStatus('');
                            setAmountMin('');
                            setAmountMax('');
                            if (page === 0) {
                                setSearchTrigger(prev => prev + 1);
                            } else {
                                setPage(0);
                            }
                        }}
                        className="text-sm text-slate-500 hover:text-slate-900 px-3 py-2 rounded-xl border border-slate-200 bg-white transition-all"
                    >
                        초기화
                    </button>
                </div>

                {/* 에러 메시지 */}
                {error && (
                    <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                        <p className="text-sm font-semibold text-rose-700">{error}</p>
                    </div>
                )}

                {/* 전체 건수 */}
                <div className="mb-4 text-sm text-slate-500 px-1">
                    전체 <span className="font-bold text-slate-900">{pageData?.totalElements || 0}</span>건
                </div>

                {/* 주문 목록 테이블 */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        {/* 헤더 */}
                        <thead className="bg-slate-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase">
                                주문번호
                            </th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase">
                                테이블
                            </th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase">
                                주문일시
                            </th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase text-right">
                                금액
                            </th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase text-center">
                                상태
                            </th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase text-right">
                                관리
                            </th>
                        </tr>
                        </thead>

                        {/* 바디 */}
                        <tbody className="divide-y divide-gray-50">
                        {orders.length > 0 ? (
                            orders.map((order) => (
                                <tr
                                    key={order.orderPublicId}
                                    className="hover:bg-slate-50 transition-colors group"
                                >
                                    {/* 주문번호 */}
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        <div className="text-sm">
                                            {order.orderPublicId.substring(0, 8)}...
                                        </div>
                                    </td>

                                    {/* 테이블 */}
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-semibold text-slate-700">
                                            {order.tableCode}
                                        </div>
                                    </td>

                                    {/* 주문일시 */}
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-600">
                                            {formatDateTime(order.orderedAt)}
                                        </div>
                                    </td>

                                    {/* 금액 */}
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-sm font-bold text-black-400">
                                            {formatAmount(order.totalAmount)}원
                                        </div>
                                    </td>

                                    {/* 상태 */}
                                    <td className="px-6 py-4 text-center">
                                        <StatusBadge status={order.status}/>
                                    </td>

                                    {/* 관리 버튼 */}
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            type="button"
                                            onClick={() => handleViewDetail(order)}
                                            className="rounded-xl bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-300 transition-colors"
                                        >
                                            상세
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-6 py-10 text-center text-gray-400"
                                >
                                    주문 내역이 없습니다.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>

                    {/* 페이지네이션 컨트롤 */}
                    {pageData && pageData.totalElements > 0 && (
                        <div className="flex justify-center items-center gap-4 py-6 border-t border-gray-100">
                            <button
                                disabled={page === 0}
                                onClick={() => setPage(page - 1)}
                                className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-5 h-5"/>
                            </button>
                            <span className="text-sm font-bold text-gray-600">
                                {pageData.page + 1} / {pageData.totalPages}
                            </span>
                            <button
                                disabled={!pageData.hasNext}
                                onClick={() => setPage(page + 1)}
                                className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="w-5 h-5"/>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 주문 상세 모달 */}
            {view === 'DETAIL' && selectedOrder && (
                <SalesOrderDetailModal
                    storePublicId={storePublicId}
                    orderPublicId={selectedOrder.orderPublicId}
                    onClose={handleCloseDetail}
                    onRefunded={handleRefunded}
                />
            )}
        </div>
    );
}
