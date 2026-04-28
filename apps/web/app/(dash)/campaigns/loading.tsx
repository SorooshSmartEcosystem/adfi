import {
  SkeletonHero,
  SkeletonBlock,
  SkeletonCardGrid,
} from "../../../components/shared/loading-skeleton";

export default function CampaignsLoading() {
  return (
    <div>
      <SkeletonHero />
      <SkeletonBlock height={56} className="mb-md" />
      <SkeletonCardGrid count={3} />
    </div>
  );
}
