import {
  SkeletonHero,
  SkeletonCardGrid,
  SkeletonList,
} from "../../../components/shared/loading-skeleton";

export default function ReportLoading() {
  return (
    <div>
      <SkeletonHero />
      <SkeletonCardGrid count={3} />
      <SkeletonList rows={5} />
    </div>
  );
}
