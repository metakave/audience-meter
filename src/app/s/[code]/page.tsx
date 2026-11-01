import { redirect } from 'next/navigation';

export default async function ShortSurveyRedirect({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/survey/${code}`);
}
