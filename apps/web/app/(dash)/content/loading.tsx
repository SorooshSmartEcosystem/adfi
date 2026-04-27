import {
  SkeletonHero,
  SkeletonBlock,
  SkeletonCardGrid,
} from "../../../components/shared/loading-skeleton";

export default function ContentLoading() {
  return (
    <div>
      <SkeletonHero />
      <SkeletonBlock height={48} className="mb-lg" />
      <SkeletonBlock height={220} className="mb-xl" />
      <SkeletonCardGrid count={3} />
    </div>
  );
}
