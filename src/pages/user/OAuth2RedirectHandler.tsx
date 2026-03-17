import {useEffect} from "react";
import {useNavigate, useSearchParams} from "react-router-dom";
import {socialLogin} from "@/api/user/auth.ts";
import {getUserProfile} from "@/api/user/user.ts";
import {removeAccessToken, setAccessToken} from "@/utils/auth.ts";
import Loading from "@/components/loading/Loading";

const OAuth2RedirectHandler = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;

        const handleOAuthLogin = async () => {
            const code = searchParams.get("code");

            if (!code) {
                navigate("/login", {replace: true});
                return;
            }

            try {
                const res = await socialLogin(code);

                const accessTokenHeader =
                    res.headers["authorization"] || res.headers["Authorization"];

                if (!accessTokenHeader) {
                    throw new Error("로그인 응답 헤더에 Authorization 이 없습니다.");
                }

                setAccessToken(accessTokenHeader);

                // 저장 직후 실제 인증이 되는지 한 번 검증
                await getUserProfile();

                if (cancelled) {
                    return;
                }

                const redirectPath = localStorage.getItem("post_login_redirect");
                if (redirectPath) {
                    localStorage.removeItem("post_login_redirect");
                    navigate(redirectPath, {replace: true});
                } else {
                    navigate("/dashboard", {replace: true});
                }
            } catch (err) {
                console.error("로그인 처리 실패:", err);
                removeAccessToken();
                alert("로그인 처리에 실패했습니다.");
                navigate("/login", {replace: true});
            }
        };

        void handleOAuthLogin();

        return () => {
            cancelled = true;
        };
    }, [searchParams, navigate]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-white">
            <Loading/>
        </div>
    );
};

export default OAuth2RedirectHandler;