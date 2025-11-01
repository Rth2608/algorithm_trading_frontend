import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const UserPlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" x2="19" y1="8" y2="14" />
        <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
);

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

//Tailwind Ŭ����
const FORM_BG_CLASS = "p-8 max-w-md mx-auto my-12 bg-gray-800 rounded-xl shadow-2xl text-white font-sans";
const TITLE_CLASS = "text-3xl font-extrabold mb-2 text-indigo-400";
const SLOGAN_CLASS = "text-sm text-gray-400 mb-8";
const SUBTITLE_CLASS = "text-xl font-semibold text-white mb-6 border-b border-gray-700 pb-2";
const INPUT_CLASS = "w-full p-3 my-2 box-border rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500 transition duration-150";
const BUTTON_CLASS = "w-full py-3 mt-6 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition duration-150 disabled:bg-indigo-800 disabled:opacity-70 disabled:cursor-not-allowed";
const CONSENT_BOX_CLASS = "border border-gray-700 p-4 my-6 text-left text-sm bg-gray-900 rounded-lg";
const CONSENT_TITLE_CLASS = "text-indigo-400 font-bold mb-2";

const SignupPage: React.FC = () => {
    const navigate = useNavigate();

    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [receiveEmail, setReceiveEmail] = useState(true);
    const [isAgreed, setIsAgreed] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        if (!isAgreed) {
            setMessage('�ʼ� ����� �����ؾ� ������ �� �ֽ��ϴ�.');
            return;
        }

        console.log(`ȸ������ ��û: �г���: ${nickname}, �̸���: ${email}, �˸� ����: ${receiveEmail ? '��' : '�ƴϿ�'}`);
        setMessage('ȸ�������� ���������� �Ϸ�Ǿ����ϴ�!');

        setTimeout(() => navigate('/main'), 2000);
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className={FORM_BG_CLASS}>
                <h2 className={TITLE_CLASS}>
                    <UserPlusIcon className="inline-block w-6 h-6 mr-2" />
                    SGFM SignUp
                </h2>
                <p className={SLOGAN_CLASS}>Start with Signup.</p>
                <h3 className={SUBTITLE_CLASS}>Required Information</h3>

                {message && (
                    <div className={`mb-4 p-3 rounded-lg text-sm font-semibold ${message.includes('����') ? 'bg-green-500/20 text-green-300 border border-green-400' : 'bg-red-500/20 text-red-300 border border-red-400'}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <label className="block text-left mb-4 text-sm font-medium text-gray-300">
                        Nickname
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Enter the nickname want to use."
                            className={INPUT_CLASS}
                            required
                        />
                    </label>

                    <label className="block text-left mb-4 text-sm font-medium text-gray-300">
                        Email address (as ID)
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Put your email address."
                            className={INPUT_CLASS}
                            required
                        />
                    </label>

                    <label className="flex items-center justify-start text-left mb-6 font-medium text-gray-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={receiveEmail}
                            onChange={(e) => setReceiveEmail(e.target.checked)}
                            className="mr-2 h-4 w-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                        />
                        Accept receiving investment information and notification emails (optional)
                    </label>

                    <div className={CONSENT_BOX_CLASS}>
                        <p className={CONSENT_TITLE_CLASS}>
                            Mandatory consent: Terms of use and collection of personal information
                        </p>
                        <p className="text-xs text-gray-500 text-justify mb-3 max-h-20 overflow-y-auto pr-1">
                            This service (SGFM) is an AI-based investment information provision service that collects information such as nicknames and e-mail addresses from users to use the service, which is used only for the purpose of providing and improving the service. The collected information is secured in accordance with relevant laws and regulations and will be destroyed immediately upon withdrawal.
                        </p>
                        <label className="flex items-center mt-3 font-bold text-gray-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isAgreed}
                                onChange={(e) => setIsAgreed(e.target.checked)}
                                className="mr-2 h-4 w-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                            />
                            All agree with the above mandatory terms and conditions.
                        </label>
                    </div>

                    <button
                        type="submit"
                        className={BUTTON_CLASS}
                        disabled={!isAgreed || !nickname || !email}
                    >
                        <CheckCircleIcon className="inline-block w-5 h-5 mr-2" />
                        Sign up is complete
                    </button>

                    <p className="mt-4 text-sm text-gray-500 text-center">
                        Already have your account? <span className="text-indigo-400 cursor-pointer hover:underline" onClick={() => navigate('/')}>Return to Login page</span>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default SignupPage;
