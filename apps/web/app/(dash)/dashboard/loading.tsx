import {
  SkeletonHero,
  SkeletonCardGrid,
  SkeletonBlock,
  SkeletonList,
} from "../../../components/shared/loading-skeleton";

export default function DashboardLoading() {
  return (
    <div>
      <SkeletonHero />
      <SkeletonCardGrid />
      <SkeletonBlock height={280} className="mb-xl" />
      <SkeletonList rows={4} />
    </div>
  );
}
