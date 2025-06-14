// This file exports generateStaticParams for the dynamic [boardId] route
export async function generateStaticParams() {
  // For static export, we return an empty array to generate a fallback page
  // This allows the client-side routing to handle dynamic routes
  return [];
} 