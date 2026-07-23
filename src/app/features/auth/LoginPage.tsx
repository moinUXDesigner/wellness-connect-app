import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Headphones,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Square,
  SquareCheck,
} from 'lucide-react';
import AuthActionLoader from './AuthActionLoader';
import { loginRequest } from './apiAuth';
import { getPostAuthRedirectPath } from './roleRedirects';
import brandLogo from '../../../assets/brand/aura-connect-logo.png';
import brandTitle from '../../../assets/brand/aura-wellness-connect-title.svg';
import loginHeroReference from '../../../assets/auth/login-hero-reference.png';
import { notifyError, toast } from '../shared/lib/toast';

const shellBackground =
  'radial-gradient(circle at 15% 18%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 24%, rgba(248,245,255,0.93) 65%, rgba(244,240,255,0.96) 100%)';

const rightPanelBackground =
  'radial-gradient(circle at 50% 8%, rgba(255,255,255,0.92) 0%, rgba(248,245,255,0.94) 28%, rgba(242,239,255,0.96) 70%, rgba(237,233,255,0.98) 100%)';

const waveEmoji = String.fromCodePoint(0x1f44b);

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const state = location.state as { authNotice?: string } | null;
    if (state?.authNotice) toast.warning(state.authNotice);
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#ffffff_0%,_#f7f4ff_42%,_#f3efff_100%)] px-0 py-0 text-[#090B3F] sm:px-4 lg:px-0">
      {loading ? <AuthActionLoader action="login" /> : null}

      <div
        className="flex min-h-screen w-full max-w-[1920px] flex-col overflow-hidden rounded-[0px] border border-[#ebe4ff] bg-white shadow-[0_24px_80px_rgba(95,67,230,0.12)]"
        style={{ background: shellBackground }}
      >
        <div className="grid min-h-0 flex-1 items-stretch lg:grid-cols-[40%_60%]">
          <section className="flex h-full flex-col items-center px-5 pb-5 pt-4 sm:px-8 sm:pb-8 sm:pt-7 lg:px-12 lg:pb-12 lg:pt-8 xl:px-16">
            <BrandHeader />

            <div className="flex flex-1 items-start sm:items-center">
              <div className="mx-auto w-full max-w-[540px] pt-3 sm:pt-8 lg:pt-4">
                <div className="space-y-3 text-center sm:space-y-4">
                  <h1 className="text-[1.7rem] font-bold leading-[1.02] tracking-[-0.045em] text-[#10155e] sm:text-[2rem]">
                    Welcome back! <span className="align-[8%] text-[0.88em]">{waveEmoji}</span>
                  </h1>
                  <p className="mx-auto max-w-[520px] text-[1rem] font-medium leading-7 text-[#53639b] sm:text-[1.12rem] sm:leading-8">
                    Sign in to continue your wellness journey.
                  </p>
                </div>

                <form
                  className="mt-7 space-y-5 sm:mt-10 sm:space-y-7"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setLoading(true);

                    try {
                      const user = await loginRequest(email, password);
                      navigate(getPostAuthRedirectPath(user));
                    } catch (error) {
                      notifyError(error, 'Unable to login.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <div className="space-y-2 sm:space-y-2.5">
                    <label className="block text-[0.95rem] font-semibold text-[#14185c] sm:text-[1.05rem]">Email or mobile number</label>
                    <InputShell tone="active" icon={<Mail className="h-5 w-5" strokeWidth={2.2} />}>
                      <input
                        autoComplete="username"
                        className="w-full bg-transparent text-[0.98rem] font-medium text-[#151a5f] placeholder:text-[#959dbb] focus:outline-none sm:text-[1rem]"
                        type="text"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Enter your email or mobile number"
                        required
                      />
                    </InputShell>
                  </div>

                  <div className="space-y-2 sm:space-y-2.5">
                    <label className="block text-[0.95rem] font-semibold text-[#14185c] sm:text-[1.05rem]">Password</label>
                    <InputShell
                      icon={<LockKeyhole className="h-5 w-5" strokeWidth={2.15} />}
                      trailing={
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="inline-flex items-center gap-2 rounded-full px-1 py-1 text-sm font-semibold text-[#6270a7] transition hover:text-[#4f35ff]"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" strokeWidth={2} /> : <Eye className="h-5 w-5" strokeWidth={2} />}
                          <span className="text-[0.96rem] sm:text-[1.02rem]">{showPassword ? 'Hide' : 'Show'}</span>
                        </button>
                      }
                    >
                      <input
                        autoComplete="current-password"
                        className="w-full bg-transparent text-[0.98rem] font-medium text-[#151a5f] placeholder:text-[#959dbb] focus:outline-none sm:text-[1rem]"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
                        required
                      />
                    </InputShell>
                  </div>

                  <div className="flex items-center justify-between gap-4 text-[0.95rem] sm:text-[1.02rem]">
                    <button
                      type="button"
                      onClick={() => setRememberMe((value) => !value)}
                      className="inline-flex items-center gap-2.5 text-[#55649b] transition hover:text-[#4f35ff]"
                    >
                      {rememberMe ? (
                        <SquareCheck className="h-[1.18rem] w-[1.18rem] text-[#8c7cff]" strokeWidth={1.9} />
                      ) : (
                        <Square className="h-[1.18rem] w-[1.18rem] text-[#b6bddd]" strokeWidth={1.9} />
                      )}
                      <span className="font-medium">Remember me</span>
                    </button>

                    <Link className="font-semibold text-[#5b2dff] transition hover:text-[#4319dd]" to="/forgot-password">
                      Forgot password?
                    </Link>
                  </div>

                  <button
                    className="inline-flex h-[56px] w-full items-center justify-center gap-3 rounded-[16px] bg-[linear-gradient(90deg,#4b27ff_0%,#6f3dff_100%)] px-6 text-[1.08rem] font-semibold text-white shadow-[0_18px_36px_rgba(89,45,255,0.28)] transition hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-60 sm:h-[60px] sm:text-[1.18rem]"
                    type="submit"
                    disabled={loading}
                  >
                    <span>Sign In</span>
                    <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
                  </button>

                  <div className="flex items-center gap-4 pt-0.5 sm:gap-5 sm:pt-1">
                    <span className="h-px flex-1 bg-[#e4ddf8]" />
                    <span className="text-[0.98rem] font-semibold tracking-[0.12em] text-[#6675aa] sm:text-[1.03rem] sm:tracking-[0.14em]">OR</span>
                    <span className="h-px flex-1 bg-[#e4ddf8]" />
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <button
                      type="button"
                      onClick={() => {
                        toast.info('Google sign-in is coming soon. Please continue with email and password for now.');
                      }}
                      className="inline-flex h-[56px] w-full items-center justify-center gap-4 rounded-[16px] border border-[#d9d1f5] bg-white px-6 text-[1rem] font-semibold text-[#182062] shadow-[0_12px_24px_rgba(122,102,211,0.08)] transition hover:border-[#cbbff8] hover:bg-[#fcfbff] sm:h-[60px] sm:text-[1.04rem]"
                    >
                      <GoogleIcon />
                      <span>Continue with Google</span>
                    </button>
                  </div>
                </form>

                <p className="mt-6 text-center text-[0.98rem] font-medium text-[#54639a] sm:mt-8 sm:text-[1.02rem]">
                  Don&apos;t have an account?{' '}
                  <Link className="font-semibold text-[#5b2dff] transition hover:text-[#4319dd]" to="/signup">
                    Sign up
                  </Link>
                </p>
              </div>
            </div>
          </section>

          <section
            className="relative hidden h-full min-h-[620px] flex-col overflow-hidden border-t border-[#efebff] lg:flex lg:border-l lg:border-t-0"
            style={{ background: rightPanelBackground }}
          >
            {/* Support Button */}
            <div className="absolute top-6 right-6 lg:top-8 lg:right-10 xl:right-12 z-20">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2.5 rounded-full px-1 py-1 text-[1rem] font-medium text-[#5b679e] transition hover:text-[#5228ff]"
              >
                <span>Need help?</span>
                <Headphones className="h-5 w-5 text-[#7152ff]" strokeWidth={2.1} />
                <span className="font-semibold text-[#5b2dff]">Contact Support</span>
              </Link>
            </div>

            {/* Full-screen illustration */}
            <IllustrationScene />
          </section>
        </div>

        <footer className="hidden border-t border-[#efebff] bg-[linear-gradient(180deg,rgba(250,248,255,0.92)_0%,rgba(245,242,255,0.98)_100%)] px-5 py-5 sm:px-8 sm:py-6 lg:px-12 xl:px-14">
          <div className="grid gap-5 rounded-[22px] border border-white/70 bg-white/35 px-5 py-5 shadow-[0_18px_36px_rgba(114,90,220,0.07)] backdrop-blur-[6px] md:grid-cols-[1fr_auto_0.9fr] md:items-center md:gap-7 lg:px-10 lg:py-6">
            <SecurityInfo
              icon={<ShieldCheck className="h-8 w-8 text-[#7152ff]" strokeWidth={1.9} />}
              title="Your privacy and security are our top priorities."
              description="We use industry-standard encryption to keep your information safe."
            />
            <div className="hidden h-14 w-px bg-[#ddd5f6] md:block" />
            <SecurityInfo
              icon={<LockKeyhole className="h-7 w-7 text-[#7152ff]" strokeWidth={1.95} />}
              title="Secure sign in"
              description="Your data is always protected."
            />
          </div>
        </footer>
      </div>
    </div>
  );
}

function BrandHeader() {
  return (
    <div className="mx-auto flex w-full max-w-[540px] justify-center">
      <Link to="/" className="inline-flex items-center gap-3 rounded-2xl transition hover:opacity-95">
        <img
          src={brandLogo}
          alt="Aura Wellness logo icon"
          className="h-[46px] w-[46px] shrink-0 object-contain sm:h-[58px] sm:w-[58px]"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <img
            src={brandTitle}
            alt="Aura Wellness Connect"
            className="h-[24px] w-auto max-w-[190px] object-contain sm:h-[55px] sm:max-w-[304px]"
          />
          {/* <p className="pl-0.5 text-[1.02rem] font-medium text-[#5a689e]">Connect. Heal. Thrive.</p> */}
        </div>
      </Link>
    </div>
  );
}

function InputShell({
  children,
  icon,
  trailing,
  tone = 'default',
}: {
  children: ReactNode;
  icon: ReactNode;
  trailing?: ReactNode;
  tone?: 'default' | 'active';
}) {
  return (
    <div
      className={`flex h-[56px] items-center gap-3 rounded-[16px] border bg-white px-4 shadow-[0_10px_24px_rgba(111,92,220,0.05)] transition sm:h-[60px] sm:px-5 ${
        tone === 'active' ? 'border-[#6c4eff] shadow-[0_14px_28px_rgba(91,45,255,0.10)]' : 'border-[#d7d9ef]'
      }`}
    >
      <span className={`${tone === 'active' ? 'text-[#6c4eff]' : 'text-[#8d95b7]'}`}>{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

function IllustrationOrbit() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 mx-auto hidden h-[290px] max-w-[640px] md:block lg:h-[312px]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 640 312" fill="none" aria-hidden="true">
        <path
          d="M152 206C211 88 305 42 402 48C489 54 558 122 582 201"
          stroke="#8772FF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="2 11"
        />
      </svg>

      <WellnessOrbitCard className="left-[118px] top-[132px]" label="Body" icon={<BodyIcon />} />
      <WellnessOrbitCard className="left-1/2 top-[10px] -translate-x-1/2" label="Mind" icon={<MindIcon />} />
      <WellnessOrbitCard className="right-[56px] top-[130px]" label="Balance" icon={<BalanceIcon />} />
    </div>
  );
}

function WellnessOrbitCard({
  className,
  label,
  icon,
}: {
  className: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <div className={`absolute flex flex-col items-center ${className}`}>
      <div className="flex h-[96px] w-[96px] items-center justify-center rounded-full bg-white shadow-[0_16px_40px_rgba(123,103,223,0.18)] ring-1 ring-[#efebff] lg:h-[104px] lg:w-[104px]">
        {icon}
      </div>
      <span className="mt-3 text-[1rem] font-semibold tracking-[-0.02em] text-[#171b60] lg:text-[1.08rem]">{label}</span>
    </div>
  );
}

function IllustrationScene() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <img
        src={loginHeroReference}
        alt="Heart mascot sitting in a chair with laptop and wellness orbit icons"
        className="h-full w-full object-cover drop-shadow-[0_16px_32px_rgba(118,94,210,0.10)]"
      />
    </div>
  );
}

function SecurityInfo({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 shadow-[0_8px_20px_rgba(116,95,212,0.08)]">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-[1.02rem] font-semibold text-[#1a1e66]">{title}</p>
        <p className="max-w-[520px] text-[0.98rem] leading-7 text-[#5e6b9f]">{description}</p>
      </div>
    </div>
  );
}

function HeroBackdrop() {
  return (
    <>
      <Cloud className="left-[8%] top-[19%] hidden md:block" width={116} />
      <Cloud className="right-[9%] top-[9%] hidden md:block" width={148} />
      <Cloud className="left-[-4%] bottom-[22%] opacity-45" width={92} />
      <Cloud className="right-[-6%] bottom-[14%] opacity-35" width={96} />
      <div className="absolute inset-y-[32%] left-[6%] w-8 rounded-full bg-[linear-gradient(180deg,rgba(233,229,251,0.35),rgba(233,229,251,0.02))] blur-sm" />
      <div className="absolute bottom-[18%] right-[6%] h-[104px] w-[44px] rounded-full bg-[linear-gradient(180deg,rgba(233,229,251,0.32),rgba(233,229,251,0.02))] blur-sm" />
    </>
  );
}

function Cloud({ className, width }: { className: string; width: number }) {
  const height = Math.round(width * 0.42);

  return (
    <div
      className={`absolute ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 180 80" className="h-full w-full fill-[#e7e2fb]">
        <path d="M31 62C13 62 3 53 3 39C3 24 16 13 31 15C35 5 45 0 57 0C74 0 85 11 87 28C90 27 94 26 98 26C111 26 121 34 123 46H145C163 46 177 57 177 71H31V62Z" />
      </svg>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12.24 10.286v3.97h5.52c-.24 1.28-.96 2.364-2.04 3.092l3.304 2.564c1.928-1.778 3.036-4.402 3.036-7.528 0-.728-.064-1.428-.184-2.098H12.24Z"
      />
      <path
        fill="#4285F4"
        d="M12 22c2.756 0 5.068-.912 6.756-2.472l-3.304-2.564c-.912.616-2.076.98-3.452.98-2.652 0-4.9-1.792-5.704-4.204H2.88v2.644A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.296 13.74A5.998 5.998 0 0 1 5.98 12c0-.604.108-1.188.316-1.74V7.616H2.88A10.001 10.001 0 0 0 2 12c0 1.608.384 3.128 1.064 4.384l3.232-2.644Z"
      />
      <path
        fill="#34A853"
        d="M12 6.056c1.5 0 2.848.516 3.912 1.528l2.928-2.928C17.064 2.992 14.752 2 12 2A10 10 0 0 0 2.88 7.616l3.416 2.644C7.1 7.848 9.348 6.056 12 6.056Z"
      />
    </svg>
  );
}

function BodyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M24 10C24 17 21 22 16 26C12 23 10 17 10 12C17 12 22 15 24 20C26 15 31 12 38 12C38 17 36 23 32 26C27 22 24 17 24 10Z" fill="#56D0B2" />
      <path d="M24 16C26 23 31 27 38 29C34 35 29 38 24 38C19 38 14 35 10 29C17 27 22 23 24 16Z" fill="#44BE9E" />
      <path d="M24 8C27 10 29 15 29 21C29 27 27 32 24 36C21 32 19 27 19 21C19 15 21 10 24 8Z" fill="#33C6A5" />
    </svg>
  );
}

function MindIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M24 39C13 32 8 26 8 18.5C8 12.701 12.477 8 18 8C21.29 8 23.707 9.662 24 12.207C24.293 9.662 26.71 8 30 8C35.523 8 40 12.701 40 18.5C40 26 35 32 24 39Z"
        fill="url(#mindHeart)"
      />
      <defs>
        <linearGradient id="mindHeart" x1="12" y1="9" x2="34" y2="37" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8A62FF" />
          <stop offset="1" stopColor="#5B2DFF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function BalanceIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="20" fill="url(#balanceBlue)" />
      <path d="M16.5 29C19 32 21.3 33 24 33C26.7 33 29 32 31.5 29" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx="18.5" cy="19.5" r="2.2" fill="white" />
      <circle cx="29.5" cy="19.5" r="2.2" fill="white" />
      <defs>
        <linearGradient id="balanceBlue" x1="12" y1="10" x2="34" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5EA6FF" />
          <stop offset="1" stopColor="#2D75F4" />
        </linearGradient>
      </defs>
    </svg>
  );
}
