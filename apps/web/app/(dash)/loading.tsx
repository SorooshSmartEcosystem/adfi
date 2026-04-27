import {
  SkeletonHero,
  SkeletonCardGrid,
  SkeletonList,
} from "../../components/shared/loading-skeleton";

// Streamed placeholder for any /(dash)/* route while the server-side data
// fetches resolve. Goal: paint structure immediately so navigating between
// dash pages feels instant.
export default function DashLoading() {
  return (
    <div>
      <SkeletonHero />
      <SkeletonCardGrid />
      <SkeletonList rows={5} />
    </div>
  );
}
