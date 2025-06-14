import BoardClientPage from './BoardClientPage';

// Generate static params for static export
export async function generateStaticParams() {
  // Return empty array for static export
  // This allows client-side routing to handle dynamic routes
  return [];
}

export default function BoardPage() {
  return <BoardClientPage />;
} 