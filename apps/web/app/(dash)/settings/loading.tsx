import {
  SkeletonHero,
  SkeletonList,
} from "../../../components/shared/loading-skeleton";

export default function SettingsLoading() {
  return (
    <div>
      <SkeletonHero />
      <SkeletonList rows={6} />
    </div>
  );
}
