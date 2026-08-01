export interface OnboardingAnimationProps {
  type: 'name' | 'goal' | 'contact' | 'email' | 'password' | 'review' | 'success';
  className?: string;
}

export default function OnboardingAnimation(props: OnboardingAnimationProps): JSX.Element;
