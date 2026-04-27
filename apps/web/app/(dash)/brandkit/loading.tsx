import {
  SkeletonHero,
  SkeletonCardGrid,
  SkeletonBlock,
} from "../../../components/shared/loading-skeleton";

export default function BrandKitLoading() {
  return (
    <div>
      <SkeletonHero />
      <SkeletonCardGrid count={4} />
      <SkeletonBlock height={220} className="mb-xl" />
    </div>
  );
}
