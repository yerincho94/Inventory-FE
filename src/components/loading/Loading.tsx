import Lottie from 'react-lottie-player';
import loadingJson from '../../components/loading/loading.json';

export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center p-20 space-y-8">
            <div className="w-96 h-96">
                <Lottie
                    loop
                    animationData={loadingJson}
                    play
                    style={{width: '100%', height: '100%'}}
                />
            </div>

            <div className="text-center space-y-3">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                    잠시만 기다려주세요...
                </h3>
                <p className="text-lg text-gray-500 font-medium">
                    데이터를 열심히 처리하고 있습니다.
                </p>
            </div>
        </div>
    );
}