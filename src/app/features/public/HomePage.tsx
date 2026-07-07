import { useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronRight,
  Heart,
  Leaf,
  Menu,
  ShieldCheck,
  Smile,
  Star,
  TrendingUp,
  UserRound,
  X,
} from 'lucide-react';
import homepageIllustration from '../../../assets/Homepage_Illustration_Asset.png';
import brandLogo from '../../../assets/brand/aura-connect-logo.png';

const MOBILE_FEATURE_ROWS = [
  {
    icon: UserRound,
    title: 'Personalized for You',
    description: 'Tailored recommendations for your unique wellness.',
  },
  {
    icon: ShieldCheck,
    title: 'Private & Secure',
    description: 'Your data is protected with enterprise-grade security.',
  },
  {
    icon: TrendingUp,
    title: 'Track & Grow',
    description: 'Monitor progress and build healthy habits that last.',
  },
];

const DESKTOP_FEATURES = [
  { icon: Leaf, label: ['Personalized', 'for You'] },
  { icon: ShieldCheck, label: ['Private &', 'Secure'] },
  { icon: TrendingUp, label: ['Track &', 'Grow'] },
];

const QUICK_STATS = [
  { icon: Smile, value: '10K+', label: 'Happy Members' },
  { icon: Star, value: '500+', label: 'Expert Resources' },
  { icon: ShieldCheck, value: '100%', label: 'Privacy Focused' },
];

const MOBILE_NAV_LINKS = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'About', href: '#about' },
  { label: 'Careers', to: '/careers' },
  { label: 'Sign In', to: '/login' },
];

const DESKTOP_NAV_LINKS = [
  { label: 'Home', href: '#home', active: true },
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#home' },
  { label: 'About Us', href: '#features' },
];

function MobileBrandMark() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-3">
      <img src={brandLogo} alt="WellnessConnect" className="h-12 w-12 shrink-0 object-contain" />
      <div className="min-w-0 leading-none">
        <div className="truncate text-[1.08rem] font-black tracking-[-0.05em] text-[#10205f]">
          Wellness<span className="text-[#5d4bff]">Connect</span>
        </div>
        <div className="mt-1 truncate text-[0.72rem] font-medium tracking-[-0.02em] text-[#5d6c9f]">
          Connect. Heal. Thrive.
        </div>
      </div>
    </Link>
  );
}

function DesktopBrandMark() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-3">
      <img
        src={brandLogo}
        alt="WellnessConnect"
        className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
      />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[1.12rem] font-semibold tracking-[-0.03em] text-[#0d1c67] sm:text-[1.5rem]">
          WellnessConnect
        </div>
        <div className="truncate text-[0.9rem] text-[#55649d] sm:text-[1.04rem]">
          Connect. Heal. Thrive.
        </div>
      </div>
    </Link>
  );
}

function MobileMenuButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Toggle menu"
      className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#ece5ff] bg-white/90 text-[#23357e] shadow-[0_16px_34px_rgba(117,93,215,0.14)] backdrop-blur"
      onClick={onClick}
    >
      {open ? <X size={24} /> : <Menu size={24} />}
    </button>
  );
}

function MobileHomePage({
  mobileOpen,
  setMobileOpen,
}: {
  mobileOpen: boolean;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <main
      id="home"
      className="min-h-screen bg-[#fbf8ff] text-[#0f1d67] lg:hidden"
      style={{
        background:
          'radial-gradient(circle at 50% 0%, rgba(189, 176, 255, 0.2), transparent 32%), radial-gradient(circle at 8% 20%, rgba(141, 208, 255, 0.12), transparent 20%), radial-gradient(circle at 92% 14%, rgba(196, 181, 253, 0.2), transparent 20%), linear-gradient(180deg, #fcfaff 0%, #f8f5ff 100%)',
      }}
    >
      <div className="mx-auto min-h-screen w-full max-w-[430px] px-4 pb-8 pt-3 sm:px-5">
        <header className="relative">
          <div className="flex items-center gap-3">
            <MobileBrandMark />
            <div className="ml-auto">
              <MobileMenuButton open={mobileOpen} onClick={() => setMobileOpen((value) => !value)} />
            </div>
          </div>

          {mobileOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.85rem)] z-20 rounded-[28px] border border-[#ece5ff] bg-white/95 p-3 shadow-[0_24px_60px_rgba(110,88,216,0.18)] backdrop-blur">
              <nav className="flex flex-col gap-1">
                {MOBILE_NAV_LINKS.map((item) =>
                  item.to ? (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-2xl px-4 py-3 text-[0.98rem] font-semibold text-[#20317e] transition-colors hover:bg-[#f5f0ff]"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-2xl px-4 py-3 text-[0.98rem] font-semibold text-[#20317e] transition-colors hover:bg-[#f5f0ff]"
                    >
                      {item.label}
                    </a>
                  ),
                )}
              </nav>
            </div>
          )}
        </header>

        <section className="pt-4">
          <div className="relative overflow-hidden rounded-[34px]">
            <div className="pointer-events-none absolute inset-x-6 top-6 h-20 rounded-full bg-[radial-gradient(circle,rgba(165,144,255,0.22),transparent_72%)] blur-2xl" />
            <img
              src={homepageIllustration}
              alt="WellnessConnect hero illustration"
              className="relative block h-auto w-full select-none object-contain"
              draggable={false}
            />
          </div>
        </section>

        <section className="px-2 pt-5 text-center">
          <h1 className="text-[clamp(2rem,10vw,3.35rem)] font-black leading-[0.92] tracking-[-0.08em] text-[#101d67] sm:text-[3.7rem]">
            Better Well being
            <br />
            starts with <span className="text-[#6952ff]">you</span>
          </h1>

          <div className="mx-auto mt-5 flex max-w-[180px] items-center justify-center gap-3 text-[#7a71b5]">
            <span className="h-px flex-1 bg-[#ddd5fb]" />
            <Leaf size={18} className="text-[#6dd6d5]" />
            <span className="h-px flex-1 bg-[#ddd5fb]" />
          </div>

          <p
            id="about"
            className="mx-auto mt-5 max-w-[340px] text-[1.01rem] leading-[1.55] tracking-[-0.02em] text-[#5b699b]"
          >
            WellnessConnect brings everything you need for a healthier mind, body, and life together in one place.
            You do not have to do it alone. We are here for you.
          </p>
        </section>

        <section className="px-1 pt-6">
          <Link
            to="/get-started"
            className="flex h-16 w-full items-center justify-between rounded-full bg-[linear-gradient(135deg,#6d4cff_0%,#5a46ff_45%,#4b33ea_100%)] px-7 text-[1rem] font-extrabold tracking-[-0.03em] text-white shadow-[0_22px_45px_rgba(90,70,236,0.34)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <Leaf size={23} />
            </span>
            <span className="flex-1 text-center text-[1.01rem] sm:text-[1.08rem]">Start Your Journey</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              <ArrowRight size={24} />
            </span>
          </Link>

          <div className="pt-5 text-center">
            <Link
              to="/about"
              className="inline-flex items-center gap-2 text-[0.98rem] font-semibold text-[#5d4bff] transition-colors hover:text-[#4d3ce9]"
            >
              Know More
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        <section id="features" className="pt-6">
          <div className="rounded-[32px] border border-white/70 bg-white/80 px-4 py-3 shadow-[0_22px_60px_rgba(116,93,214,0.12)] backdrop-blur">
            {MOBILE_FEATURE_ROWS.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <div key={feature.title}>
                  <div className="flex items-start gap-4 py-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f2edff] text-[#674fff] shadow-[0_12px_28px_rgba(104,79,255,0.08)]">
                      <Icon size={26} strokeWidth={1.8} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-[1.05rem] font-extrabold tracking-[-0.04em] text-[#15226c]">
                        {feature.title}
                      </h2>
                      <p className="mt-1 text-[0.96rem] leading-[1.5] tracking-[-0.02em] text-[#6976a4]">
                        {feature.description}
                      </p>
                    </div>

                    <div className="pt-1 text-[#6952ff]">
                      <ChevronRight size={28} strokeWidth={2.1} />
                    </div>
                  </div>

                  {index < MOBILE_FEATURE_ROWS.length - 1 && <div className="h-px bg-[#ebe6fb]" />}
                </div>
              );
            })}
          </div>
        </section>

        <section className="pt-7">
          <div className="rounded-[30px] border border-white/70 bg-white/82 px-4 py-5 shadow-[0_22px_60px_rgba(116,93,214,0.11)] backdrop-blur">
            <div className="grid grid-cols-3 gap-2">
              {QUICK_STATS.map((stat, index) => {
                const Icon = stat.icon;

                return (
                  <div
                    key={stat.label}
                    className={`flex flex-col items-center px-2 text-center ${
                      index < QUICK_STATS.length - 1 ? 'border-r border-[#ece7fb]' : ''
                    }`}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f2edff] text-[#674fff]">
                      <Icon size={26} strokeWidth={1.9} />
                    </div>
                    <div className="mt-3 text-[1.1rem] font-black tracking-[-0.05em] text-[#12206a]">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-[0.93rem] font-medium leading-[1.3] tracking-[-0.02em] text-[#5f6d9b]">
                      {stat.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function DesktopHomePage() {
  return (
    <main
      id="home"
      className="relative hidden h-screen overflow-hidden px-4 py-3 text-[#121a5d] sm:px-6 sm:py-4 lg:block lg:px-10 lg:py-6"
      style={{
        background:
          'radial-gradient(circle at 16% 8%, rgba(192, 178, 255, 0.42), transparent 22%), radial-gradient(circle at 92% 10%, rgba(176, 194, 255, 0.16), transparent 18%), radial-gradient(circle at 50% 100%, rgba(170, 140, 255, 0.08), transparent 20%), linear-gradient(180deg, #f9f7ff 0%, #fbfaff 44%, #f7f6ff 100%)',
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-[1700px] flex-col">
        <header className="shrink-0">
          <div className="flex items-center gap-4 lg:gap-8">
            <DesktopBrandMark />

            <nav className="hidden flex-1 items-center justify-center gap-14 lg:flex">
              {DESKTOP_NAV_LINKS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`relative text-[1.1rem] transition-colors ${
                    item.active ? 'font-medium text-[#5f47ff]' : 'text-[#4d5b90] hover:text-[#5f47ff]'
                  }`}
                >
                  {item.label}
                  {item.active && (
                    <span className="absolute left-1/2 top-[calc(100%+0.65rem)] h-[3px] w-14 -translate-x-1/2 rounded-full bg-[#5f47ff]" />
                  )}
                </a>
              ))}
            </nav>

            <div className="ml-auto hidden items-center gap-5 lg:flex">
              <Link
                to="/careers"
                className="inline-flex items-center gap-2 rounded-[18px] border border-[#cfe7d6] bg-[#eafaf0] px-6 py-4 text-[1rem] font-semibold text-[#1f7a3f] shadow-[0_10px_25px_rgba(34,197,94,0.08)] transition-transform hover:-translate-y-0.5 hover:bg-[#dff7e8]"
              >
                <BriefcaseBusiness size={18} />
                Careers
              </Link>
              <Link
                to="/login"
                className="rounded-[18px] border border-[#d6d1f2] bg-white/60 px-7 py-4 text-[1.02rem] font-semibold text-[#122056] shadow-[0_10px_25px_rgba(116,93,214,0.06)] transition-transform hover:-translate-y-0.5"
              >
                Sign In
              </Link>
              <Link
                to="/get-started"
                className="rounded-[18px] bg-[linear-gradient(135deg,#6b4cff_0%,#4d3aed_100%)] px-8 py-4 text-[1.02rem] font-semibold text-white shadow-[0_18px_36px_rgba(84,68,235,0.3)] transition-transform hover:-translate-y-0.5"
              >
                Get Started
              </Link>
            </div>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 items-center">
          <div className="grid w-full items-center gap-8 lg:grid-cols-[0.94fr_1.06fr] lg:gap-10">
            <div className="max-w-[760px]">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#f0ebff] px-4 py-2 text-[0.92rem] font-medium text-[#5b46ff] shadow-[0_10px_24px_rgba(110,82,240,0.08)]">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#6349ff] text-white">
                  <Heart size={11} fill="currentColor" />
                </span>
                <span>Your well-being, our priority</span>
              </div>

              <h1 className="mt-6 max-w-[760px] text-[clamp(2.6rem,4.1vw,4.4rem)] font-semibold leading-[0.97] tracking-[-0.065em] text-[#111a62]">
                Better well-being
                <br />
                starts with <span className="text-[#6247ff]">you</span>
              </h1>

              <p className="mt-5 max-w-[670px] text-[1rem] leading-[1.65] text-[#516091] sm:text-[1.08rem]">
                WellnessConnect brings everything you need for a healthier mind, body, and life together in one place.
                You do not have to do it alone. We are here for you.
              </p>

              <div className="mt-6 flex flex-wrap gap-4">
                <Link
                  to="/get-started"
                  className="inline-flex items-center gap-3 rounded-[18px] bg-[linear-gradient(135deg,#6d4cff_0%,#5138ee_100%)] px-8 py-4 text-[1rem] font-medium text-white shadow-[0_20px_36px_rgba(86,70,225,0.26)] transition-transform hover:-translate-y-0.5"
                >
                  <Leaf size={18} />
                  Start Your Journey
                  <ArrowRight size={18} className="ml-1" />
                </Link>

                <Link
                  to="/about"
                  className="inline-flex items-center gap-3 rounded-[18px] border border-[#ddd6fb] bg-white/75 px-7 py-4 text-[1rem] font-medium text-[#5f4dff] shadow-[0_10px_24px_rgba(112,90,225,0.08)] transition-transform hover:-translate-y-0.5"
                >
                  Know More
                  <ArrowRight size={18} />
                </Link>
              </div>

              <div id="features" className="mt-8 grid gap-4 sm:grid-cols-3">
                {DESKTOP_FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.label.join(' ')} className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f1ecff] text-[#6247ff] shadow-[0_14px_30px_rgba(120,95,226,0.1)]">
                        <Icon size={26} />
                      </div>
                      <span className="max-w-[110px] text-[0.98rem] leading-[1.45] text-[#243263]">
                        {feature.label.map((line) => (
                          <span key={line} className="block">
                            {line}
                          </span>
                        ))}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 grid max-w-[650px] grid-cols-3 gap-3 rounded-[24px] bg-white/55 p-4 shadow-[0_18px_55px_rgba(113,92,210,0.08)] backdrop-blur-md">
                {QUICK_STATS.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="flex items-center gap-3 rounded-[18px] px-2 py-1">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f1ebff] text-[#6247ff]">
                        <Icon size={22} />
                      </div>
                      <div>
                        <div className="text-[1.1rem] font-semibold text-[#111a62]">{stat.value}</div>
                        <div className="text-[0.92rem] text-[#566497]">{stat.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative flex items-center justify-center lg:justify-end">
              <div className="relative w-full max-w-[925px]">
                <img
                  src={homepageIllustration}
                  alt="WellnessConnect hero illustration"
                  className="h-auto w-full select-none object-contain"
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <MobileHomePage mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <DesktopHomePage />
    </>
  );
}
