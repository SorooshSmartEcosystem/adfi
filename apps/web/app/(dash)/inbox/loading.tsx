import {
  SkeletonHero,
  SkeletonList,
} from "../../../components/shared/loading-skeleton";

export default function InboxLoading() {
  return (
    <div>
      <SkeletonHero />
      <SkeletonList rows={6} />
    </div>
  );
}
