import PrimaryButton from '../../../components/PrimaryButton';

export default function WelcomePrimaryButton({ onPress }: { onPress: () => void }) {
  return <PrimaryButton label="Get started" showArrow onPress={onPress} />;
}
